import express from 'express';
import { body, param } from 'express-validator';
import {
  createMenuItem,
  deleteMenuItem,
  getMenu,
  toggleMenuItem,
  updateMenuItem,
  updateMenuStock
} from '../controllers/menuController.js';
import { protect } from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';

const router = express.Router();

const idValidator = param('id').isMongoId().withMessage('Valid menu item id is required');
const priceValidator = body('price').optional().isFloat({ min: 0 }).withMessage('Menu price must be non-negative');
const stockValidator = body('stockStatus').optional().isIn(['IN_STOCK', 'OUT_OF_STOCK']).withMessage('Invalid stock status');

router.get('/', getMenu);
router.post(
  '/',
  protect,
  allowRoles('ADMIN'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('price').isFloat({ min: 0 }).withMessage('Menu price must be non-negative'),
    body('prepTimeMinutes').optional().isInt({ min: 1 }).withMessage('Prep time must be positive')
  ],
  validate,
  createMenuItem
);
router.patch('/:id', protect, allowRoles('ADMIN'), [idValidator, priceValidator, stockValidator], validate, updateMenuItem);
router.patch('/:id/toggle', protect, allowRoles('ADMIN', 'STAFF'), [idValidator, body('isAvailable').optional().isBoolean()], validate, toggleMenuItem);
router.patch('/:id/stock', protect, allowRoles('ADMIN', 'STAFF', 'KITCHEN'), [idValidator, stockValidator], validate, updateMenuStock);
router.delete('/:id', protect, allowRoles('ADMIN'), [idValidator], validate, deleteMenuItem);

export default router;
