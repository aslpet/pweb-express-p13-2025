import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';
import { ResponseHelper } from '../utils/response';
import { PaginationHelper } from '../utils/pagination';
import { PaginationQuery } from '../types';

// Create Book (with "Create or Restore" logic)
export const createBook = async (req: Request, res: Response) => {
  try {
    const {
      title,
      writer,
      publisher,
      description,
      publication_year,
      price,
      stock_quantity,
      genre_id
    } = req.body;

    // 1. Validasi required fields (same as before)
    if (!title || !writer || !publisher || !publication_year || !price || stock_quantity === undefined || !genre_id) {
      return ResponseHelper.error(res, 'Missing required fields', 400);
    }

    // 2. Cek apakah genre exists (same as before)
    const genre = await prisma.genre.findFirst({
      where: {
        id: genre_id,
        deleted_at: null
      }
    });

    if (!genre) {
      return ResponseHelper.error(res, 'Genre not found', 404);
    }

    // 3. Check for *any* book with this title (active or deleted)
    //    We remove the `deleted_at: null` filter here
    const existingBook = await prisma.book.findFirst({
      where: {
        title: title
      }
    });

    // 4. Decide: Restore, Error, or Create
    if (existingBook) {
      
      // --- CASE A: Book exists and is ACTIVE ---
      // This is the duplicate error
      if (existingBook.deleted_at === null) {
        return ResponseHelper.error(res, 'Book with this title already exists', 400);
      }

      // --- CASE B: Book exists but is SOFT-DELETED ---
      // This is your "restore" logic!
      else {
        const restoredBook = await prisma.book.update({
          where: { id: existingBook.id },
          data: {
            // Restore it
            deleted_at: null,

            // Update its details with the new request data
            writer: writer,
            publisher: publisher,
            description: description || '',
            publication_year: publication_year,
            price: price,
            stock_quantity: stock_quantity, // Set to the new quantity
            // Or, if you meant "add to" old stock:
            // stock_quantity: { increment: stock_quantity }, 
            genre_id: genre_id,
          },
          select: {
            id: true,
            title: true,
            updated_at: true
          }
        });
        
        // Return 200 OK, since we updated, not created
        return ResponseHelper.success(res, restoredBook, 'Book restored and updated successfully', 200);
      }
    } 
    
    // --- CASE C: Book does not exist at all ---
    // This is the original "create" logic
    else {
      const newBook = await prisma.book.create({
        data: {
          title : title,
          writer : writer,
          publisher : publisher,
          description: description || '',
          publication_year : publication_year,
          price: price,
          stock_quantity : stock_quantity,
          genre_id : genre_id,
          deleted_at: null // Explicitly set to null
        },
        select: {
          id: true,
          title: true,
          created_at: true,
        }
      });

      return ResponseHelper.success(res, newBook, 'Book added successfully', 201);
    }

  } catch (error) {
    console.error('Create book error:', error);
    if (error instanceof Error){
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // The P2002 error will now only be triggered
        // by a race condition (e.g., two requests at the exact same time)
        // because our logic checks first.
        if (error.code === 'P2002') {
          return ResponseHelper.error(res, 'Duplicate field value', 400);
        }
        // ... other error codes ...
      }
    }
    return ResponseHelper.error(res, 'Internal server error', 500);
  }
};

// Get All Books
export const getAllBooks = async (req: Request<{}, {}, {}, PaginationQuery>, res: Response) => {
  try {
    const { page, limit, skip } = PaginationHelper.getPaginationParams(req.query);
    const { search, orderByTitle, orderByPublishDate } = req.query;

    // Build where clause
    const where: any = {
      deleted_at: null
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { writer: { contains: search, mode: 'insensitive' } },
        { publisher: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Build orderBy
    const orderBy: any[] = [];
    if (orderByTitle) {
      orderBy.push({ title: orderByTitle });
    }
    if (orderByPublishDate) {
      orderBy.push({ publication_year: orderByPublishDate });
    }
    if (orderBy.length === 0) {
      orderBy.push({ created_at: 'desc' });
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          writer: true,
          publisher: true,
          description: true,
          publication_year: true,
          price: true,
          stock_quantity: true,
          genre: {
            select: {
              name: true
            }
          }
        }
      }),
      prisma.book.count({ where })
    ]);

    // Transform response to match documentation
    const transformedBooks = books.map(book => ({
      id: book.id,
      title: book.title,
      writer: book.writer,
      publisher: book.publisher,
      description: book.description,
      publication_year: book.publication_year,
      price: book.price,
      stock_quantity: book.stock_quantity,
      genre: book.genre.name
    }));

    const meta = PaginationHelper.createMeta(page, limit, total);

    return ResponseHelper.paginated(res, transformedBooks, meta, 'Get all book successfully', 200);
  } catch (error) {
    console.error('Get all books error:', error);
    return ResponseHelper.error(res, 'Internal server error', 500);
  }
};

// Get Books by Genre
export const getBooksByGenre = async (req: Request<{ genre_id: string }, {}, {}, PaginationQuery>, res: Response) => {
  try {
    const { genre_id } = req.params;
    const { page, limit, skip } = PaginationHelper.getPaginationParams(req.query);
    const { search, orderByTitle, orderByPublishDate } = req.query;

    // Cek apakah genre exists
    const genre = await prisma.genre.findFirst({
      where: {
        id: genre_id,
        deleted_at: null
      }
    });

    if (!genre) {
      return ResponseHelper.error(res, 'Genre not found', 404);
    }

    // Build where clause
    const where: any = {
      genre_id,
      deleted_at: null
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { writer: { contains: search, mode: 'insensitive' } },
        { publisher: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Build orderBy
    const orderBy: any[] = [];
    if (orderByTitle) {
      orderBy.push({ title: orderByTitle });
    }
    if (orderByPublishDate) {
      orderBy.push({ publication_year: orderByPublishDate });
    }
    if (orderBy.length === 0) {
      orderBy.push({ created_at: 'desc' });
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          writer: true,
          publisher: true,
          description: true,
          publication_year: true,
          price: true,
          stock_quantity: true,
          genre: {
            select: {
              name: true
            }
          }
        }
      }),
      prisma.book.count({ where })
    ]);

    // Transform response
    const transformedBooks = books.map(book => ({
      id: book.id,
      title: book.title,
      writer: book.writer,
      publisher: book.publisher,
      description: book.description,
      genre: book.genre.name,
      publication_year: book.publication_year,
      price: book.price,
      stock_quantity: book.stock_quantity
    }));

    const meta = PaginationHelper.createMeta(page, limit, total);

    return ResponseHelper.paginated(res, transformedBooks, meta, 'Get all book by genre successfully', 200);
  } catch (error) {
    console.error('Get books by genre error:', error);
    return ResponseHelper.error(res, 'Internal server error', 500);
  }
};

// Get Book by ID
export const getBookById = async (req: Request, res: Response) => {
  try {
    const { book_id } = req.params;

    const book = await prisma.book.findFirst({
      where: {
        id: book_id,
        deleted_at: null
      },
      select: {
        id: true,
        title: true,
        writer: true,
        publisher: true,
        description: true,
        publication_year: true,
        price: true,
        stock_quantity: true,
        genre: {
          select: {
            name: true
          }
        }
      }
    });

    if (!book) {
      return ResponseHelper.error(res, 'Book not found', 404);
    }

    // Transform response
    const transformedBook = {
      id: book.id,
      title: book.title,
      writer: book.writer,
      publisher: book.publisher,
      description: book.description,
      publication_year: book.publication_year,
      price: book.price,
      stock_quantity: book.stock_quantity,
      genre: book.genre.name
    };

    return ResponseHelper.success(res, transformedBook, 'Get book detail successfully', 200);
  } catch (error) {
    console.error('Get book by id error:', error);
    return ResponseHelper.error(res, 'Internal server error', 500);
  }
};

// Update Book
export const updateBook = async (req: Request, res: Response) => {
  try {
    const { book_id } = req.params;
    const { description, price, stock_quantity } = req.body;

    // Cek apakah book exists
    const existing = await prisma.book.findFirst({
      where: {
        id: book_id,
        deleted_at: null
      }
    });

    if (!existing) {
      return ResponseHelper.error(res, 'Book not found', 404);
    }

    // Build update data (hanya field yang boleh diupdate)
    const updateData: any = {};
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (stock_quantity !== undefined) updateData.stock_quantity = stock_quantity;

    if (Object.keys(updateData).length === 0) {
      return ResponseHelper.error(res, 'No fields to update', 400);
    }

    const updated = await prisma.book.update({
      where: { id: book_id },
      data: updateData,
      select: {
        id: true,
        title: true,
        updated_at: true
      }
    });

    return ResponseHelper.success(res, updated, 'Book updated successfully', 200);
  } catch (error) {
    console.error('Update book error:', error);
    return ResponseHelper.error(res, 'Internal server error', 500);
  }
};

// Delete Book (Soft Delete)
export const deleteBook = async (req: Request, res: Response) => {
  try {
    const { book_id } = req.params;

    // Cek apakah book exists
    const existing = await prisma.book.findFirst({
      where: {
        id: book_id,
        deleted_at: null
      }
    });

    if (!existing) {
      return ResponseHelper.error(res, 'Book not found', 404);
    }

    // Soft delete (update deleted_at)
    await prisma.book.update({
      where: { id: book_id },
      data: { deleted_at: new Date() }
    });

    return ResponseHelper.success(res, undefined, 'Book removed successfully', 200);
  } catch (error) {
    console.error('Delete book error:', error);
    return ResponseHelper.error(res, 'Internal server error', 500);
  }
};