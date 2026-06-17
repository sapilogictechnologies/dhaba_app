import express from 'express';
import { body } from 'express-validator';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { protect } from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';

const router = express.Router();

router.get('/', getSettings);
router.patch(
  '/',
  protect,
  allowRoles('ADMIN'),
  [
    body('minDeliveryOrderAmount').optional().isFloat({ min: 0 }).withMessage('Minimum delivery order must be non-negative'),
    body('acceptanceWindowMinutes').optional().isInt({ min: 1 }).withMessage('Acceptance window must be at least 1 minute'),
    body('deliveryCharges.within5km').optional().isFloat({ min: 0 }).withMessage('Within 5 km charge must be non-negative'),
    body('deliveryCharges.between5to10km').optional().isFloat({ min: 0 }).withMessage('5 to 10 km charge must be non-negative')
  ],
  validate,
  updateSettings
);

export default router;
