import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  customerRegister,
  customerLogin,
  getCustomerProfile,
  updateCustomerProfile,
  changeCustomerPassword,
  addCustomerAddress,
  deleteCustomerAddress,
  getCustomerOrders
} from '../controllers/customerController.js';

const router = Router();

// Public
router.post('/register', customerRegister);
router.post('/login', customerLogin);

// Protected (customer must be logged in)
router.use(protect);
router.get('/me', getCustomerProfile);
router.patch('/me', updateCustomerProfile);
router.post('/me/change-password', changeCustomerPassword);
router.get('/me/orders', getCustomerOrders);
router.post('/me/addresses', addCustomerAddress);
router.delete('/me/addresses/:addressId', deleteCustomerAddress);

export default router;
