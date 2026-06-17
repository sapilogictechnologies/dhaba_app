import Expense, { EXPENSE_CATEGORIES } from '../models/Expense.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { auditLog } from '../utils/auditLogger.js';

const dateRange = (dateValue) => {
  const date = dateValue || new Date().toISOString().slice(0, 10);
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);
  return { date, start, end };
};

export const getExpenses = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.date) {
    const { start, end } = dateRange(req.query.date);
    filter.date = { $gte: start, $lte: end };
  } else if (req.query.startDate && req.query.endDate) {
    const start = new Date(`${req.query.startDate}T00:00:00.000Z`);
    const end = new Date(`${req.query.endDate}T23:59:59.999Z`);
    filter.date = { $gte: start, $lte: end };
  }

  if (req.query.category) filter.category = req.query.category;

  const expenses = await Expense.find(filter).sort({ date: -1 }).limit(500);
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  res.json({ success: true, message: 'Expenses loaded', data: { expenses, total } });
});

export const getCategories = asyncHandler(async (_req, res) => {
  res.json({ success: true, message: 'Categories loaded', data: { categories: EXPENSE_CATEGORIES } });
});

export const addExpense = asyncHandler(async (req, res) => {
  if (!req.body.category || !EXPENSE_CATEGORIES.includes(req.body.category)) {
    throw new AppError('Valid category is required', 400);
  }
  if (!req.body.amount || Number(req.body.amount) <= 0) {
    throw new AppError('Amount must be greater than 0', 400);
  }

  const expense = new Expense({
    date: req.body.date ? new Date(req.body.date) : new Date(),
    category: req.body.category,
    description: req.body.description || '',
    amount: Number(req.body.amount),
    paymentMode: req.body.paymentMode || 'CASH',
    note: req.body.note || '',
    addedBy: req.user?._id || null
  });

  await expense.save();
  await auditLog({ req, action: 'expense_add', entityType: 'Expense', entityId: expense._id, after: expense.toObject() });

  res.status(201).json({ success: true, message: 'Expense added', data: { expense } });
});

export const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw new AppError('Expense not found', 404);

  const before = expense.toObject();
  if (req.body.date) expense.date = new Date(req.body.date);
  if (req.body.category && EXPENSE_CATEGORIES.includes(req.body.category)) expense.category = req.body.category;
  if (req.body.description !== undefined) expense.description = req.body.description;
  if (req.body.amount !== undefined && Number(req.body.amount) > 0) expense.amount = Number(req.body.amount);
  if (req.body.paymentMode) expense.paymentMode = req.body.paymentMode;
  if (req.body.note !== undefined) expense.note = req.body.note;

  await expense.save();
  await auditLog({ req, action: 'expense_update', entityType: 'Expense', entityId: expense._id, before, after: expense.toObject() });

  res.json({ success: true, message: 'Expense updated', data: { expense } });
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw new AppError('Expense not found', 404);

  await auditLog({ req, action: 'expense_delete', entityType: 'Expense', entityId: expense._id, before: expense.toObject() });
  await expense.deleteOne();

  res.json({ success: true, message: 'Expense deleted', data: {} });
});

export const getExpenseSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date();

  const summary = await Expense.aggregate([
    { $match: { date: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { total: -1 } }
  ]);

  const grandTotal = summary.reduce((s, c) => s + c.total, 0);
  res.json({ success: true, message: 'Summary loaded', data: { summary, grandTotal, startDate: start, endDate: end } });
});
