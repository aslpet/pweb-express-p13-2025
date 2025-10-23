import { Router } from 'express';
import { 
  createTransaction, 
  getAllTransactions, 
  getTransactionById, 
  getTransactionStatistics 
} from '../controllers/transactionController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// All transaction routes need authentication
router.post('/', authMiddleware, createTransaction);
router.get('/statistics', authMiddleware, getTransactionStatistics);
router.get('/', authMiddleware, getAllTransactions);
router.get('/:transaction_id', authMiddleware, getTransactionById);

export default router;