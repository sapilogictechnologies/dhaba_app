import mongoose from 'mongoose';

export const ORDER_SOURCES = [
  'WALKIN_TABLE',
  'TAKEAWAY_COUNTER',
  'PHONE_MANUAL',
  'QR_TABLE',
  'ONLINE_PICKUP',
  'ONLINE_DELIVERY'
];

export const DELIVERY_TYPES = ['TABLE', 'TAKEAWAY', 'PICKUP', 'DELIVERY'];
export const DISTANCE_BUCKETS = ['WITHIN_5', 'BETWEEN_5_10', 'ABOVE_10', 'NA'];
export const PAYMENT_METHODS = ['CASH', 'UPI', 'MIXED'];
export const PAYMENT_STATUSES = ['UNPAID', 'UNDER_REVIEW', 'PAID', 'REJECTED', 'PARTIAL'];
export const ITEM_STATUSES = ['PENDING', 'PREPARING', 'READY', 'CANCELLED'];
export const ORDER_STATUSES = [
  'PLACED',
  'UNDER_REVIEW',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'PICKED_UP',
  'COMPLETED',
  'CLOSED',
  'CANCELLED',
  'EXPIRED'
];

const orderItemSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    nameSnapshot: { type: String, required: true },
    priceSnapshot: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    itemNotes: { type: String, default: '' },
    itemStatus: { type: String, enum: ITEM_STATUSES, default: 'PENDING' }
  },
  { _id: false }
);

const kotItemSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    nameSnapshot: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    itemNotes: { type: String, default: '' }
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    role: { type: String, default: 'SYSTEM' },
    note: { type: String, default: '' },
    at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, required: true, unique: true },
    kotNo: { type: String, required: true, unique: true },
    billNo: { type: String, unique: true, sparse: true },
    source: { type: String, enum: ORDER_SOURCES, required: true },
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', default: null },
    tableNumber: { type: Number, default: null },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    customerName: { type: String, default: '', trim: true },
    customerPhone: { type: String, default: '', trim: true },
    customerKey: { type: String, default: '', index: true },
    notes: { type: String, default: '' },
    items: { type: [orderItemSchema], validate: [(items) => items.length > 0, 'Order must have at least one item'] },
    kotCreatedAt: { type: Date, default: Date.now },
    kotItemsSnapshot: { type: [kotItemSchema], default: [] },
    subtotal: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
    delivery: {
      type: { type: String, enum: DELIVERY_TYPES, default: 'TABLE' },
      addressText: { type: String, default: '' },
      landmark: { type: String, default: '' },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      distanceBucket: { type: String, enum: DISTANCE_BUCKETS, default: 'NA' },
      distanceKm: { type: Number, default: null },
      etaMinutesCalculated: { type: Number, default: 0 },
      etaMinutesOverride: { type: Number, default: null },
      scheduledPickupTime: { type: Date, default: null }
    },
    payment: {
      method: { type: String, enum: PAYMENT_METHODS, default: 'CASH' },
      paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'UNPAID' },
      paidAmount: { type: Number, default: 0, min: 0 },
      balanceAmount: { type: Number, default: 0, min: 0 },
      utr: { type: String, default: '' },
      proofImageUrl: { type: String, default: '' },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      verifiedAt: { type: Date, default: null },
      rejectionReason: { type: String, default: '' }
    },
    status: { type: String, enum: ORDER_STATUSES, default: 'PLACED', index: true },
    cancelReason: { type: String, default: '' },
    cancelReasonText: { type: String, default: '' },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancelledAt: { type: Date, default: null },
    statusHistory: { type: [statusHistorySchema], default: [] },
    mergeHistory: {
      type: [
        {
          mergedOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
          orderNo: String,
          mergedAt: { type: Date, default: Date.now },
          mergedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        }
      ],
      default: []
    },
    movedFromTable: { type: Number, default: null },
    movedToTable: { type: Number, default: null }
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ source: 1, status: 1 });
orderSchema.index({ customerPhone: 1, customerKey: 1 });

export default mongoose.model('Order', orderSchema);
