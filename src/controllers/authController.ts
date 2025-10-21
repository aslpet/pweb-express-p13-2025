import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { ResponseHelper } from '../utils/response';
import { AuthRequest } from '../middlewares/authMiddleware';
import { RegisterRequest, LoginRequest } from '../types';

// Register
export const register = async (req: Request<{}, {}, RegisterRequest>, res: Response) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return ResponseHelper.error(res, 'Username dan password wajib diisi', 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return ResponseHelper.error(res, 'Username sudah digunakan', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email: email || null
      },
      select: {
        id: true,
        username: true,
        email: true,
        created_at: true
      }
    });

    return ResponseHelper.success(res, user, 'Registrasi berhasil', 201);
  } catch (error) {
    console.error('Register error:', error);
    return ResponseHelper.error(res, 'Terjadi kesalahan server');
  }
};

// Login
export const login = async (req: Request<{}, {}, LoginRequest>, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return ResponseHelper.error(res, 'Username dan password wajib diisi', 400);
    }

    if (!process.env.JWT_SECRET) {
      return ResponseHelper.error(res, 'Server configuration error');
    }

    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return ResponseHelper.error(res, 'Username atau password salah', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return ResponseHelper.error(res, 'Username atau password salah', 401);
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return ResponseHelper.success(
      res,
      {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      },
      'Login berhasil'
    );
  } catch (error) {
    console.error('Login error:', error);
    return ResponseHelper.error(res, 'Terjadi kesalahan server');
  }
};

// Get Me
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return ResponseHelper.error(res, 'User tidak terautentikasi', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        created_at: true,
        updated_at: true
      }
    });

    if (!user) {
      return ResponseHelper.error(res, 'User tidak ditemukan', 404);
    }

    return ResponseHelper.success(res, user);
  } catch (error) {
    console.error('Get me error:', error);
    return ResponseHelper.error(res, 'Terjadi kesalahan server');
  }
};