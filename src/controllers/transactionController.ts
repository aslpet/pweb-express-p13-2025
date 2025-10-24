import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { ResponseHelper } from '../utils/response';
import { PaginationHelper } from '../utils/pagination';
import { AuthRequest } from '../middlewares/authMiddleware';
import { PaginationQuery, CreateTransactionRequest } from '../types';

// Create Transaction (unchanged)
export const createTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { user_id, items } = req.body as CreateTransactionRequest;

    if (!user_id || !items || !Array.isArray(items) || items.length === 0) {
      return ResponseHelper.error(res, 'Invalid request data', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: user_id }
    });

    if (!user) {
      return ResponseHelper.error(res, 'User not found', 404);
    }

    const bookIds = items.map(item => item.book_id);
    const books = await prisma.book.findMany({
      where: {
        id: { in: bookIds },
        deleted_at: null
      }
    });

    if (books.length !== bookIds.length) {
      return ResponseHelper.error(res, 'One or more books not found', 404);
    }

    for (const item of items) {
      const book = books.find(b => b.id === item.book_id);
      if (!book) {
        return ResponseHelper.error(res, `Book ${item.book_id} not found`, 404);
      }
      if (book.stock_quantity < item.quantity) {
        return ResponseHelper.error(res, `Insufficient stock for book: ${book.title}`, 400);
      }
    }

    let totalQuantity = 0;
    let totalPrice = 0;

    for (const item of items) {
      const book = books.find(b => b.id === item.book_id);
      if (book) {
        totalQuantity += item.quantity;
        totalPrice += Number(book.price) * item.quantity;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          user_id
        }
      });

      for (const item of items) {
        await tx.orderItem.create({
          data: {
            order_id: order.id,
            book_id: item.book_id,
            quantity: item.quantity
          }
        });

        await tx.book.update({
          where: { id: item.book_id },
          data: {
            stock_quantity: {
              decrement: item.quantity
            }
          }
        });
      }

      return order;
    });

    return ResponseHelper.success(
      res,
      {
        transaction_id: result.id,
        total_quantity: totalQuantity,
        total_price: totalPrice
      },
      'Transaction created successfully',
      201
    );
  } catch (error) {
    console.error('Create transaction error:', error);
    return ResponseHelper.error(res, 'Internal server error', 500);
  }
};

// Get All Transactions (FIXED)
export const getAllTransactions = async (req: Request<{}, {}, {}, PaginationQuery>, res: Response) => {
  try {
    const { page, limit, skip } = PaginationHelper.getPaginationParams(req.query);
    const { search, orderById, orderByAmount } = req.query;

    console.log('Query params:', { search, orderById, orderByAmount, page, limit, skip });

    // Build where clause
    const where: any = {};

    // FIX: Hanya apply search jika formatnya valid UUID
    if (search) {
      // Regex untuk validasi UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (uuidRegex.test(search)) {
        // Jika valid UUID, search by exact match
        where.id = search;
      } else {
        // Jika bukan UUID valid, cari di user_id atau ignore
        // Untuk sekarang, kita biarkan kosong (return all)
        console.log('Search term is not a valid UUID, ignoring search filter');
      }
    }

    // Get total count
    const total = await prisma.order.count({ where });

    console.log('Total orders found:', total);

    // Jika tidak ada data
    if (total === 0) {
      const meta = PaginationHelper.createMeta(page, limit, 0);
      return ResponseHelper.paginated(res, [], meta, 'Get all transaction successfully', 200);
    }

    // Decide fetch strategy
    const shouldFetchAll = orderByAmount !== undefined;
    const fetchLimit = shouldFetchAll ? Math.min(total, 1000) : limit;
    const fetchSkip = shouldFetchAll ? 0 : skip;

    console.log('Fetch strategy:', { shouldFetchAll, fetchLimit, fetchSkip });

    // Fetch orders
    const orders = await prisma.order.findMany({
      where,
      skip: fetchSkip,
      take: fetchLimit,
      include: {
        order_items: {
          include: {
            book: {
              select: {
                price: true
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    console.log('Orders fetched:', orders.length);

    // Calculate totals
    let transformedOrders = orders.map(order => {
      let totalQuantity = 0;
      let totalPrice = 0;

      order.order_items.forEach(item => {
        totalQuantity += item.quantity;
        totalPrice += Number(item.book.price) * item.quantity;
      });

      return {
        id: order.id,
        total_quantity: totalQuantity,
        total_price: totalPrice
      };
    });

    // Apply sorting
    if (orderById) {
      transformedOrders.sort((a, b) => {
        return orderById === 'asc' 
          ? a.id.localeCompare(b.id) 
          : b.id.localeCompare(a.id);
      });
    }

    if (orderByAmount) {
      transformedOrders.sort((a, b) => {
        return orderByAmount === 'asc' 
          ? a.total_price - b.total_price 
          : b.total_price - a.total_price;
      });
    }

    // Apply pagination after sorting if needed
    if (shouldFetchAll) {
      transformedOrders = transformedOrders.slice(skip, skip + limit);
    }

    const meta = PaginationHelper.createMeta(page, limit, total);

    console.log('Final result count:', transformedOrders.length);

    return ResponseHelper.paginated(res, transformedOrders, meta, 'Get all transaction successfully', 200);
  } catch (error) {
    console.error('Get all transactions error:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return ResponseHelper.error(res, 'Internal server error', 500);
  }
};

// Get Transaction by ID (unchanged)
export const getTransactionById = async (req: Request, res: Response) => {
  try {
    const { transaction_id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: transaction_id },
      include: {
        order_items: {
          include: {
            book: true
          }
        }
      }
    });

    if (!order) {
      return ResponseHelper.error(res, 'Transaction not found', 404);
    }

    let totalQuantity = 0;
    let totalPrice = 0;

    const items = order.order_items.map(item => {
      const subtotal = Number(item.book.price) * item.quantity;
      totalQuantity += item.quantity;
      totalPrice += subtotal;

      return {
        book_id: item.book_id,
        book_title: item.book.title,
        quantity: item.quantity,
        subtotal_price: subtotal
      };
    });

    const response = {
      id: order.id,
      items,
      total_quantity: totalQuantity,
      total_price: totalPrice
    };

    return ResponseHelper.success(res, response, 'Get transaction detail successfully', 200);
  } catch (error) {
    console.error('Get transaction by id error:', error);
    return ResponseHelper.error(res, 'Internal server error', 500);
  }
};

// Get Transaction Statistics (unchanged)
export const getTransactionStatistics = async (req: Request, res: Response) => {
  try {
    const totalTransactions = await prisma.order.count();

    const allOrders = await prisma.order.findMany({
      include: {
        order_items: {
          include: {
            book: {
              select: {
                price: true,
                genre_id: true
              }
            }
          }
        }
      }
    });

    let totalAmount = 0;
    allOrders.forEach(order => {
      order.order_items.forEach(item => {
        totalAmount += Number(item.book.price) * item.quantity;
      });
    });

    const averageTransactionAmount = totalTransactions > 0 
      ? Math.round(totalAmount / totalTransactions) 
      : 0;

    const genreStats = await prisma.orderItem.groupBy({
      by: ['book_id'],
      _sum: {
        quantity: true
      }
    });

    const bookIds = genreStats.map(stat => stat.book_id);
    const books = await prisma.book.findMany({
      where: { id: { in: bookIds } },
      include: {
        genre: true
      }
    });

    const genreSales: { [key: string]: number } = {};
    genreStats.forEach(stat => {
      const book = books.find(b => b.id === stat.book_id);
      if (book && book.genre) {
        const genreName = book.genre.name;
        genreSales[genreName] = (genreSales[genreName] || 0) + (stat._sum.quantity || 0);
      }
    });

    let mostSalesGenre = '';
    let fewestSalesGenre = '';
    let maxSales = 0;
    let minSales = Infinity;

    Object.entries(genreSales).forEach(([genre, sales]) => {
      if (sales > maxSales) {
        maxSales = sales;
        mostSalesGenre = genre;
      }
      if (sales < minSales) {
        minSales = sales;
        fewestSalesGenre = genre;
      }
    });

    const statistics = {
      total_transactions: totalTransactions,
      average_transaction_amount: averageTransactionAmount,
      most_book_sales_genre: mostSalesGenre || 'N/A',
      fewest_book_sales_genre: fewestSalesGenre || 'N/A'
    };

    return ResponseHelper.success(res, statistics, 'Get transactions statistics successfully', 200);
  } catch (error) {
    console.error('Get statistics error:', error);
    return ResponseHelper.error(res, 'Internal server error', 500);
  }
};