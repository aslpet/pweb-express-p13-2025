import { Router } from 'express';
import { 
  createBook, 
  getAllBooks, 
  getBookById, 
  getBooksByGenre,
  updateBook, 
  deleteBook 
} from '../controllers/bookController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Public routes
router.get('/', getAllBooks);
router.get('/genre/:genre_id', getBooksByGenre);
router.get('/:book_id', getBookById);

// Protected routes
router.post('/', authMiddleware, createBook);
router.patch('/:book_id', authMiddleware, updateBook);
router.delete('/:book_id', authMiddleware, deleteBook);

export default router;