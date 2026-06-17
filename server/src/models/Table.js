import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema(
  {
    tableNumber: { type: Number, required: true, unique: true, min: 1 },
    capacity: { type: Number, default: 4, min: 1 },
    token: { type: String, required: true, unique: true },
    qrCodeUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    currentOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null }
  },
  { timestamps: true }
);

export default mongoose.model('Table', tableSchema);
