import express from 'express';
import { body, param, query } from 'express-validator';
import {
  acceptOrder,
  callWaiter,
  cancelOrder,
  createCustomerOrder,
  createPhoneOrder,
  createTableOrder,
  createTakeawayOrder,
  getOrderById,
  getOrders,
  getPublicMyOrders,
  getPublicOrder,
  mergeOrders,
  moveTable,
  recordPayment,
  rejectOrder,
  rejectPayment,
  updateEta,
  updateOrderItems,
  updateOrderStatus,
  verifyPayment
} from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import { publicOrderLimiter } from '../middleware/rateLimitMiddleware.js';
import { uploadPaymentProof } from '../middleware/uploadMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';

const router = express.Router();

const parseItems = (value) => {
  if (typeof value === 'string') return JSON.parse(value);
  return value;
};

const itemsValidator = body('items').custom((value) => {
  let items;
  try {
    items = parseItems(value);
  } catch {
    throw new Error('Items must be valid JSON');
  }
  if (!Array.isArray(items) || items.length === 0) throw new Error('Order must have at least one item');
  items.forEach((item) => {
    if (!item.itemId) throw new Error('Each item must include itemId');
    if (Number(item.qty) <= 0) throw new Error('Quantity must be greater than zero');
  });
  return true;
});

const idValidator = param('id').isMongoId().withMessage('Valid order id is required');
const phoneValidator = body('customerPhone').optional({ checkFalsy: true }).matches(/^[0-9+\-\s]{6,15}$/).withMessage('Valid phone number is required');

router.post('/customer', publicOrderLimiter, uploadPaymentProof, [itemsValidator, phoneValidator], validate, createCustomerOrder);
// phone+customerKey required only when no Bearer token is present (controller handles the check)
router.get('/public/my', publicOrderLimiter, getPublicMyOrders);
router.get('/public/:orderNo', publicOrderLimiter, getPublicOrder);
router.post('/:id/call-waiter', publicOrderLimiter, [idValidator], validate, callWaiter);

router.use(protect);

router.post('/table', allowRoles('ADMIN', 'STAFF'), [itemsValidator, body('tableId').optional().isMongoId().withMessage('Valid table id is required'), body('tableNumber').optional().isInt({ min: 1 }).withMessage('Valid table number is required')], validate, createTableOrder);
router.post('/takeaway', allowRoles('ADMIN', 'STAFF'), [itemsValidator, phoneValidator], validate, createTakeawayOrder);
router.post('/phone', allowRoles('ADMIN', 'STAFF'), [itemsValidator, phoneValidator], validate, createPhoneOrder);

router.get('/', allowRoles('ADMIN', 'STAFF', 'KITCHEN'), getOrders);
router.get('/:id', allowRoles('ADMIN', 'STAFF', 'KITCHEN'), [idValidator], validate, getOrderById);
router.patch('/:id/items', allowRoles('ADMIN', 'STAFF'), [idValidator, itemsValidator], validate, updateOrderItems);
router.patch('/:id/status', allowRoles('ADMIN', 'STAFF', 'KITCHEN'), [idValidator, body('status').isIn(['PLACED', 'UNDER_REVIEW', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP', 'COMPLETED', 'CLOSED', 'CANCELLED', 'EXPIRED']).withMessage('Valid status is required')], validate, updateOrderStatus);
router.patch('/:id/accept', allowRoles('ADMIN', 'STAFF'), [idValidator], validate, acceptOrder);
router.patch('/:id/reject', allowRoles('ADMIN', 'STAFF'), [idValidator, body('reason').optional().isString()], validate, rejectOrder);
router.patch('/:id/eta', allowRoles('ADMIN', 'STAFF'), [idValidator, body('etaMinutesOverride').optional({ nullable: true }).isInt({ min: 1 }).withMessage('ETA override must be positive')], validate, updateEta);
router.patch('/:id/payment/verify', allowRoles('ADMIN'), [idValidator], validate, verifyPayment);
router.patch('/:id/payment/reject', allowRoles('ADMIN'), [idValidator, body('reason').trim().notEmpty().withMessage('Payment rejection reason is required')], validate, rejectPayment);
router.patch('/:id/payment/record', allowRoles('ADMIN', 'STAFF'), [idValidator, body('paidAmount').isFloat({ min: 0 }).withMessage('Paid amount cannot be negative'), body('method').isIn(['CASH', 'UPI', 'MIXED']).withMessage('Valid payment method is required')], validate, recordPayment);
router.patch('/:id/move-table', allowRoles('ADMIN', 'STAFF'), [idValidator], validate, moveTable);
router.patch('/:id/merge', allowRoles('ADMIN', 'STAFF'), [idValidator, body('targetOrderId').isMongoId().withMessage('Valid target order id is required')], validate, mergeOrders);
router.patch('/:id/cancel', allowRoles('ADMIN', 'STAFF'), [idValidator, body('reason').trim().notEmpty().withMessage('Cancellation reason is required')], validate, cancelOrder);

export default router;
