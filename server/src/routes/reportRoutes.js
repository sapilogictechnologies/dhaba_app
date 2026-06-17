import express from 'express';
import { query } from 'express-validator';
import { exportReportCsv, getDailyReport } from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';

const router = express.Router();

const dateValidator = query('date').optional().isISO8601().withMessage('Date must be YYYY-MM-DD');

router.get('/daily', protect, allowRoles('ADMIN', 'STAFF'), [dateValidator], validate, getDailyReport);
router.get('/export', protect, allowRoles('ADMIN', 'STAFF'), [dateValidator], validate, exportReportCsv);

export default router;
