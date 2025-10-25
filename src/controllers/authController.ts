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
    const { username, email, password } = req.body;

    // Validasi input (email & password required)
    if (!email || !password) {
      return ResponseHelper.error(res, 'Email and password are required', 400);
    }

    if (!email.includes('@')) {
      if (!email.includes('.')) {
        return ResponseHelper.error(res, 'Invalid email format: \'@\' & \'.\'', 400);
      }
      return ResponseHelper.error(res, 'Invalid email format: @', 400);
    }
    if (!email.includes('.')) {
      return ResponseHelper.error(res, 'Invalid email format: .', 400);
    }

    // Cek apakah email sudah ada
    const existingUser = await prisma.user.findUnique({
      where: { email: email }
    });

    if (existingUser) {
      return ResponseHelper.error(res, 'Email already registered', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Buat user baru
    const user = await prisma.user.create({
      data: {
        username: username || null,
        email,
        password: hashedPassword
      },
      select: {
        id: true,
        email: true,
        created_at: true
      }
    });

    return ResponseHelper.success(res, user, 'User registered successfully', 201);
  } catch (error) {
    console.error('Register error:', error);
    return ResponseHelper.error(res, 'Internal server error', 500);
  }
};

// Login
export const login = async (req: Request<{}, {}, LoginRequest>, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
      return ResponseHelper.error(res, 'Email and password are required', 400);
    }

    if (!process.env.JWT_SECRET) {
      return ResponseHelper.error(res, 'Server configuration error', 500);
    }

    // Cari user by email
    const user = await prisma.user.findUnique({
      where: { email: email }
    });

    if (!user) {
      return ResponseHelper.error(res, 'Invalid credentials', 401);
    }

    // Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return ResponseHelper.error(res, 'Invalid credentials', 401);
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return ResponseHelper.success(
      res,
      { access_token: token },  // ← Sesuai dokumentasi
      'Login successfully',
      200
    );
  } catch (error) {
    console.error('Login error:', error);
    return ResponseHelper.error(res, 'Internal server error', 500);
  }
};

// Get Me
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return ResponseHelper.error(res, 'Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true
      }
    });

    if (!user) {
      return ResponseHelper.error(res, 'User not found', 404);
    }

    return ResponseHelper.success(res, user, 'Get me successfully', 200);
  } catch (error) {
    console.error('Get me error:', error);
    return ResponseHelper.error(res, 'Internal server error', 500);
  }
};
