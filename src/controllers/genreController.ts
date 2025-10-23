import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { ResponseHelper } from '../utils/response';
import { PaginationHelper } from '../utils/pagination';
import { PaginationQuery } from '../types';

// Create Genre
export const createGenre = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      return ResponseHelper.error(res, 'Name is required', 400);
    }

    // Cek duplikasi
    const existing = await prisma.genre.findUnique({
      where: { name }
    });

    if (existing) {
      return ResponseHelper.error(res, 'Genre name already exists', 400);
    }

    const genre = await prisma.genre.create({
      data: { name },
      select: {
        id: true,
        name: true,
        created_at: true
      }
    });

    return ResponseHelper.success(res, genre, 'Genre created successfully', 201);
  } catch (error) {
    console.error('Create genre error:', error);
    return ResponseHelper.error(res, 'Internal server error', 500);
  }
};

// Get All Genres
export const getAllGenres = async (req: Request<{}, {}, {}, PaginationQuery>, res: Response) => {
  try {
    const { page, limit, skip } = PaginationHelper.getPaginationParams(req.query);
    const { search, orderByName } = req.query;

    // Build where clause
    const where: any = {
      deleted_at: null
    };

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive'
      };
    }

    // Build orderBy
    const orderBy: any = {};
    if (orderByName) {
      orderBy.name = orderByName;
    }

    const [genres, total] = await Promise.all([
      prisma.genre.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          name: true
        }
      }),
      prisma.genre.count({ where })
    ]);

    const meta = PaginationHelper.createMeta(page, limit, total);

    return ResponseHelper.paginated(res, genres, meta, 'Get all genre successfully', 200);
  } catch (error) {
    console.error('Get all genres error:', error);
    return ResponseHelper.error(res, 'Internal server error', 500);
  }
};

// Get Genre by ID
export const getGenreById = async (req: Request, res: Response) => {
  try {
    const { genre_id } = req.params;

    const genre = await prisma.genre.findFirst({
      where: {
        id: genre_id,
        deleted_at: null
      },
      select: {
        id: true,
        name: true
      }
    });

    if (!genre) {
      return ResponseHelper.error(res, 'Genre not found', 404);
    }

    return ResponseHelper.success(res, genre, 'Get genre detail successfully', 200);
  } catch (error) {
    console.error('Get genre by id error:', error);
    return ResponseHelper.error(res, 'Internal server error', 500);
  }
};

// Update Genre
export const updateGenre = async (req: Request, res: Response) => {
  try {
    const { genre_id } = req.params;
    const { name } = req.body;

    if (!name) {
      return ResponseHelper.error(res, 'Name is required', 400);
    }

    // Cek apakah genre exists
    const existing = await prisma.genre.findFirst({
      where: {
        id: genre_id,
        deleted_at: null
      }
    });

    if (!existing) {
      return ResponseHelper.error(res, 'Genre not found', 404);
    }

    // Cek duplikasi name (exclude current genre)
    const duplicate = await prisma.genre.findFirst({
      where: {
        name,
        id: { not: genre_id },
        deleted_at: null
      }
    });

    if (duplicate) {
      return ResponseHelper.error(res, 'Genre name already exists', 400);
    }

    const updated = await prisma.genre.update({
      where: { id: genre_id },
      data: { name },
      select: {
        id: true,
        name: true,
        updated_at: true
      }
    });

    return ResponseHelper.success(res, updated, 'Genre updated successfully', 200);
  } catch (error) {
    console.error('Update genre error:', error);
    return ResponseHelper.error(res, 'Internal server error', 500);
  }
};

// Delete Genre (Soft Delete)
export const deleteGenre = async (req: Request, res: Response) => {
  try {
    const { genre_id } = req.params;

    // Cek apakah genre exists
    const existing = await prisma.genre.findFirst({
      where: {
        id: genre_id,
        deleted_at: null
      }
    });

    if (!existing) {
      return ResponseHelper.error(res, 'Genre not found', 404);
    }

    // Soft delete (update deleted_at)
    await prisma.genre.update({
      where: { id: genre_id },
      data: { deleted_at: new Date() }
    });

    return ResponseHelper.success(res, undefined, 'Genre removed successfully', 200);
  } catch (error) {
    console.error('Delete genre error:', error);
    return ResponseHelper.error(res, 'Internal server error', 500);
  }
};