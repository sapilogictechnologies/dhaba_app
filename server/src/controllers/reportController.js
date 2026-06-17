import Order from '../models/Order.js';
import Expense from '../models/Expense.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ordersToCsv } from '../utils/csvExport.js';
import { expireStalePlacedOrders } from './orderController.js';

const dateRange = (dateValue) => {
  const date = dateValue || new Date().toISOString().slice(0, 10);
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);
  return { date, start, end };
};

const countBy = (orders, predicate) => orders.filter(predicate).length;
const sumBy = (orders, selector) => orders.reduce((sum, order) => sum + Number(selector(order) || 0), 0);

export const getDailyReport = asyncHandler(async (req, res) => {
  await expireStalePlacedOrders();
  const { date, start, end } = dateRange(req.query.date);
  const [orders, expenses] = await Promise.all([
    Order.find({ createdAt: { $gte: start, $lte: end } }),
    Expense.find({ date: { $gte: start, $lte: end } })
  ]);
  const activeForMoney = orders.filter((order) => !['CANCELLED', 'EXPIRED'].includes(order.status));
  const completedStatuses = ['CLOSED', 'COMPLETED', 'DELIVERED', 'PICKED_UP'];
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const topItems = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end }, status: { $nin: ['CANCELLED', 'EXPIRED'] } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.nameSnapshot',
        qty: { $sum: '$items.qty' },
        amount: { $sum: { $multiply: ['$items.priceSnapshot', '$items.qty'] } }
      }
    },
    { $sort: { qty: -1, amount: -1 } },
    { $limit: 10 },
    { $project: { _id: 0, itemName: '$_id', qty: 1, amount: 1 } }
  ]);

  const report = {
    date,
    totalSales: sumBy(activeForMoney, (order) => order.payment?.paidAmount),
    cashSales: sumBy(activeForMoney.filter((order) => order.payment?.method === 'CASH'), (order) => order.payment?.paidAmount),
    upiSales: sumBy(activeForMoney.filter((order) => order.payment?.method === 'UPI'), (order) => order.payment?.paidAmount),
    mixedSales: sumBy(activeForMoney.filter((order) => order.payment?.method === 'MIXED'), (order) => order.payment?.paidAmount),
    pendingAmount: sumBy(activeForMoney, (order) => order.payment?.balanceAmount),
    totalBills: countBy(activeForMoney, (order) => Boolean(order.billNo)),
    totalOrders: orders.length,
    completedOrders: countBy(orders, (order) => completedStatuses.includes(order.status)),
    cancelledOrders: countBy(orders, (order) => order.status === 'CANCELLED'),
    expiredOrders: countBy(orders, (order) => order.status === 'EXPIRED'),
    onlineDeliveryOrders: countBy(orders, (order) => order.source === 'ONLINE_DELIVERY'),
    onlinePickupOrders: countBy(orders, (order) => order.source === 'ONLINE_PICKUP'),
    tableOrders: countBy(orders, (order) => ['WALKIN_TABLE', 'QR_TABLE'].includes(order.source)),
    takeawayOrders: countBy(orders, (order) => order.source === 'TAKEAWAY_COUNTER'),
    phoneOrders: countBy(orders, (order) => order.source === 'PHONE_MANUAL'),
    topItems,
    totalExpenses,
    netProfit: sumBy(activeForMoney, (order) => order.payment?.paidAmount) - totalExpenses,
    expenseBreakdown: expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {})
  };

  res.json({
    success: true,
    message: 'Daily report loaded',
    data: { report }
  });
});

export const exportReportCsv = asyncHandler(async (req, res) => {
  await expireStalePlacedOrders();
  const { date, start, end } = dateRange(req.query.date);
  const orders = await Order.find({ createdAt: { $gte: start, $lte: end } }).sort({ createdAt: 1 });
  const csv = ordersToCsv(orders);

  res.json({
    success: true,
    message: 'Report CSV generated',
    data: {
      filename: `dhaba-report-${date}.csv`,
      csv
    }
  });
});
