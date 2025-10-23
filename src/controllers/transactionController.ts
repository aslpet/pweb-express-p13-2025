import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { ResponseHelper } from '../utils/response';
import { PaginationHelper } from '../utils/pagination';
import { AuthRequest } from '../middlewares/authMiddleware';
import { PaginationQuery, CreateTransactionRequest } from '../types';

// Create Transaction
export const createTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { user_id, items } = req.body as CreateTransactionRequest;

    // Validasi input
    if (!user_id || !items || !Array.isArray(items) || items.length === 0) {
      return ResponseHelper.error(res, 'Invalid request data', 400);
    }

    // Cek apakah user exists
    const user = await prisma.user.findUnique({
      where: { id: user_id }
    });

    if (!user) {
      return ResponseHelper.error(res, 'User not found', 404);
    }

    // Validasi semua books dan stock
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

    // Cek stock availability
    for (const item of items) {
      const book = books.find(b => b.id === item.book_id);
      if (!book) {
        return ResponseHelper.error(res, `Book ${item.book_id} not found`, 404);
      }
      if (book.stock_quantity < item.quantity) {
        return ResponseHelper.error(res, `Insufficient stock for book: ${book.title}`, 400);
      }
    }

    // Calculate totals
    let totalQuantity = 0;
    let totalPrice = 0;

    for (const item of items) {
      const book = books.find(b => b.id === item.book_id);
      if (book) {
        totalQuantity += item.quantity;
        totalPrice += Number(book.price) * item.quantity;
      }
    }

    // Create transaction using Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Order
      const order = await tx.order.create({
        data: {
          user_id
        }
      });

      // 2. Create Order Items and update book stock
      for (const item of items) {
        // Create order item
        await tx.orderItem.create({
          data: {
            order_id: order.id,
            book_id: item.book_id,
            quantity: item.quantity
          }
        });

        // Update book stock
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

// Get All Transactions
export const getAllTransactions = async (req: Request<{}, {}, {}, PaginationQuery>, res: Response) => {
  try {
    const { page, limit, skip } = PaginationHelper.getPaginationParams(req.query);
    const { search, orderById, orderByAmount } = req.query;

    // Build where clause
    const where: any = {};

    if (search) {
      where.id = {
        contains: search,
        mode: 'insensitive'
      };
    }

    // Get orders with items
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          order_items: {
            include: {
              book: true
            }
          }
        },
        orderBy: orderById ? { id: orderById as any } : { created_at: 'desc' }
      }),
      prisma.order.count({ where })
    ]);

    // Calculate totals for each order
    const transformedOrders = orders.map(order => {
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

    // Sort by amount if specified
    if (orderByAmount) {
      transformedOrders.sort((a, b) => {
        return orderByAmount === 'asc' 
          ? a.total_price - b.total_price 
          : b.total_price - a.total_price;
      });
    }

    const meta = PaginationHelper.createMeta(page, limit, total);

    return ResponseHelper.paginated(res, transformedOrders, meta, 'Get all transaction successfully', 200);
  } catch (error) {
    console.error('Get all transactions error:', error);
    return ResponseHelper.error(res, 'Internal server error', 500);
  }
};

// Get Transaction by ID
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

    // Transform response
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

// Get Transaction Statistics
export const getTransactionStatistics = async (req: Request, res: Response) => {
  try {
    // 1. Total transactions
    const totalTransactions = await prisma.order.count();

    // 2. Calculate average transaction amount
    const allOrders = await prisma.order.findMany({
      include: {
        order_items: {
          include: {
            book: true
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

    // 3. Genre with most and fewest sales
    const genreStats = await prisma.orderItem.groupBy({
      by: ['book_id'],
      _sum: {
        quantity: true
      }
    });

    // Get books with genre info
    const bookIds = genreStats.map(stat => stat.book_id);
    const books = await prisma.book.findMany({
      where: { id: { in: bookIds } },
      include: {
        genre: true
      }
    });

    // Aggregate by genre
    const genreSales: { [key: string]: number } = {};
    genreStats.forEach(stat => {
      const book = books.find(b => b.id === stat.book_id);
      if (book && book.genre) {
        const genreName = book.genre.name;
        genreSales[genreName] = (genreSales[genreName] || 0) + (stat._sum.quantity || 0);
      }
    });

    // Find most and fewest
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