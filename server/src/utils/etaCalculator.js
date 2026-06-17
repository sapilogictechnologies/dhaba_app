import Order from '../models/Order.js';
import { kitchenActiveStatuses } from './orderStateMachine.js';

export const calculateEtaMinutes = async ({ items, distanceBucket }) => {
  const basePrep = Math.max(...items.map((item) => Number(item.prepTimeMinutes || item.prepTimeSnapshot || 15)), 15);
  const activeKitchenOrders = await Order.countDocuments({ status: { $in: kitchenActiveStatuses } });
  const queueDelay = activeKitchenOrders * 5;
  const deliveryDelay = distanceBucket === 'WITHIN_5' ? 10 : distanceBucket === 'BETWEEN_5_10' ? 20 : 0;
  return basePrep + queueDelay + deliveryDelay;
};
