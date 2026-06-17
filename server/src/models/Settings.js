import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    dhabaName: { type: String, default: 'My Dhaba', trim: true },
    phone: { type: String, default: '9999999999', trim: true },
    address: { type: String, default: 'Main Road Dhaba', trim: true },
    upiId: { type: String, default: '6394746719@kotak', trim: true },
    upiQrImageUrl: { type: String, default: '' },
    deliveryEnabled: { type: Boolean, default: true },
    minDeliveryOrderAmount: { type: Number, default: 200, min: 0 },
    acceptanceWindowMinutes: { type: Number, default: 10, min: 1 },
    orderPrefix: { type: String, default: 'ORD-' },
    kotPrefix: { type: String, default: 'KOT-' },
    billPrefix: { type: String, default: 'BILL-' },
    deliveryCharges: {
      within5km: { type: Number, default: 50, min: 0 },
      between5to10km: { type: Number, default: 100, min: 0 }
    },
    maxDeliveryDistanceKm: { type: Number, default: 3, min: 0.5 },
    deliveryChargePerKm: { type: Number, default: 20, min: 0 },
    soundEnabled: { type: Boolean, default: true },
    defaultPrepMinutes: { type: Number, default: 15, min: 1 },
    queueDelayPerOrderMinutes: { type: Number, default: 5, min: 0 },
    businessOpen: { type: Boolean, default: true },
    announcementText: { type: String, default: '' },
    taxEnabled: { type: Boolean, default: false },
    taxPercent: { type: Number, default: 5, min: 0 },
    discountEnabled: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model('Settings', settingsSchema);
