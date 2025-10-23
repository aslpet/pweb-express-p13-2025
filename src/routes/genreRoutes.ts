import { Router } from 'express';
import { 
  createGenre, 
  getAllGenres, 
  getGenreById, 
  updateGenre, 
  deleteGenre 
} from '../controllers/genreController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Public routes
router.get('/', getAllGenres);
router.get('/:genre_id', getGenreById);

// Protected routes (butuh auth)
router.post('/', authMiddleware, createGenre);
router.patch('/:genre_id', authMiddleware, updateGenre);
router.delete('/:genre_id', authMiddleware, deleteGenre);

export default router;