import mongoose from 'mongoose';

export const STOCK_STATUSES = ['IN_STOCK', 'OUT_OF_STOCK'];

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, default: '', trim: true },
    isAvailable: { type: Boolean, default: true },
    prepTimeMinutes: { type: Number, default: 15, min: 1 },
    stockStatus: { type: String, enum: STOCK_STATUSES, default: 'IN_STOCK' },
    imageUrl: { type: String, default: '' }
  },
  { timestamps: true }
);

menuItemSchema.index({ name: 1, category: 1 }, { unique: true });

export default mongoose.model('MenuItem', menuItemSchema);
