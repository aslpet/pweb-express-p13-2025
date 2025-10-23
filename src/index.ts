import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// Import routes
import authRoutes from './routes/authRoutes';
import bookRoutes from './routes/bookRoutes';
import genreRoutes from './routes/genreRoutes';
import transactionRoutes from './routes/transactionRoutes';

// Load environment variables
dotenv.config();

// Debug: Check if environment variables loaded
console.log('🔐 JWT_SECRET:', process.env.JWT_SECRET ? '✅ Loaded' : '❌ Not found');
console.log('📦 DATABASE_URL:', process.env.DATABASE_URL ? '✅ Loaded' : '❌ Not found');

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (sesuai dokumentasi)
app.get('/health-check', (req: Request, res: Response) => {
  res.json({ 
    success: true,
    message: 'Hello World!',
    data: new Date().toDateString()
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/books', bookRoutes);
app.use('/genre', genreRoutes);
app.use('/transactions', transactionRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📚 IT Literature Shop API v1.0`);
});