import Settings from '../models/Settings.js';
import asyncHandler from '../utils/asyncHandler.js';
import { auditLog } from '../utils/auditLogger.js';

export const getSettingsDocument = async () => {
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});
  return settings;
};

export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await getSettingsDocument();
  res.json({
    success: true,
    message: 'Settings loaded',
    data: { settings }
  });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await getSettingsDocument();
  const before = settings.toObject();
  const allowed = [
    'dhabaName',
    'phone',
    'address',
    'upiId',
    'upiQrImageUrl',
    'deliveryEnabled',
    'minDeliveryOrderAmount',
    'acceptanceWindowMinutes',
    'orderPrefix',
    'kotPrefix',
    'billPrefix',
    'deliveryCharges',
    'maxDeliveryDistanceKm',
    'deliveryChargePerKm',
    'soundEnabled',
    'defaultPrepMinutes',
    'queueDelayPerOrderMinutes',
    'businessOpen',
    'announcementText',
    'taxEnabled',
    'taxPercent',
    'discountEnabled'
  ];

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) settings[field] = req.body[field];
  });

  await settings.save();
  await auditLog({ req, action: 'settings_update', entityType: 'Settings', entityId: settings._id, before, after: settings.toObject() });

  res.json({
    success: true,
    message: 'Settings updated',
    data: { settings }
  });
});
