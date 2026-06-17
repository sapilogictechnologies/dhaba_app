import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import {
  getExpenses,
  getCategories,
  addExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary
} from '../controllers/expenseController.js';

const router = Router();

router.use(protect);
router.use(allowRoles('ADMIN', 'STAFF'));

router.get('/', getExpenses);
router.get('/categories', getCategories);
router.get('/summary', getExpenseSummary);
router.post('/', addExpense);
router.patch('/:id', updateExpense);
router.delete('/:id', allowRoles('ADMIN'), deleteExpense);

export default router;
