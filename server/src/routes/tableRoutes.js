import express from 'express';
import { body, param, query } from 'express-validator';
import {
  createTable,
  deleteTable,
  generateTableQr,
  getTables,
  updateTable,
  validateTableQr
} from '../controllers/tableController.js';
import { protect } from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';

const router = express.Router();

const idValidator = param('id').isMongoId().withMessage('Valid table id is required');

router.get('/validate', [query('tableNumber').isInt({ min: 1 }).withMessage('Valid table number is required'), query('token').notEmpty().withMessage('Token is required')], validate, validateTableQr);
router.get('/', protect, allowRoles('ADMIN', 'STAFF'), getTables);
router.post(
  '/',
  protect,
  allowRoles('ADMIN', 'STAFF'),
  [body('tableNumber').isInt({ min: 1 }).withMessage('Table number must be positive'), body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be positive')],
  validate,
  createTable
);
router.patch('/:id', protect, allowRoles('ADMIN', 'STAFF'), [idValidator, body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be positive')], validate, updateTable);
router.delete('/:id', protect, allowRoles('ADMIN'), [idValidator], validate, deleteTable);
router.post('/:id/qr', protect, allowRoles('ADMIN', 'STAFF'), [idValidator], validate, generateTableQr);

export default router;
