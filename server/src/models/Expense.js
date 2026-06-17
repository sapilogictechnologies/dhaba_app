import mongoose from 'mongoose';

export const EXPENSE_CATEGORIES = [
  'RAW_MATERIAL',
  'STAFF_SALARY',
  'RENT',
  'ELECTRICITY',
  'GAS',
  'DELIVERY',
  'MAINTENANCE',
  'MARKETING',
  'OTHER'
];

const expenseSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, default: Date.now },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    description: { type: String, default: '', trim: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMode: { type: String, enum: ['CASH', 'UPI', 'OTHER'], default: 'CASH' },
    note: { type: String, default: '', trim: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });

export default mongoose.model('Expense', expenseSchema);
