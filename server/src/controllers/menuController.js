import MenuItem from '../models/MenuItem.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { auditLog } from '../utils/auditLogger.js';
import { emitToRooms } from '../sockets/socket.js';

export const getMenu = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.availableOnly === 'true') {
    filter.isAvailable = true;
    filter.stockStatus = 'IN_STOCK';
  }

  const menu = await MenuItem.find(filter).sort({ category: 1, name: 1 });
  res.json({
    success: true,
    message: 'Menu loaded',
    data: { menu }
  });
});

export const createMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.create(req.body);
  await auditLog({ req, action: 'menu_create', entityType: 'MenuItem', entityId: item._id, after: item.toObject() });
  res.status(201).json({
    success: true,
    message: 'Menu item created',
    data: { item }
  });
});

export const updateMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) throw new AppError('Menu item not found', 404);

  const before = item.toObject();
  const allowed = ['name', 'category', 'price', 'description', 'isAvailable', 'prepTimeMinutes', 'stockStatus', 'imageUrl'];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) item[field] = req.body[field];
  });
  await item.save();
  await auditLog({ req, action: 'menu_update', entityType: 'MenuItem', entityId: item._id, before, after: item.toObject() });

  res.json({
    success: true,
    message: 'Menu item updated',
    data: { item }
  });
});

export const toggleMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) throw new AppError('Menu item not found', 404);
  const before = item.toObject();
  item.isAvailable = req.body.isAvailable !== undefined ? req.body.isAvailable : !item.isAvailable;
  await item.save();
  await auditLog({ req, action: 'menu_toggle', entityType: 'MenuItem', entityId: item._id, before, after: item.toObject() });

  res.json({
    success: true,
    message: 'Menu availability updated',
    data: { item }
  });
});

export const updateMenuStock = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) throw new AppError('Menu item not found', 404);
  const before = item.toObject();
  item.stockStatus = req.body.stockStatus || (item.stockStatus === 'IN_STOCK' ? 'OUT_OF_STOCK' : 'IN_STOCK');
  await item.save();
  await auditLog({ req, action: 'stock_toggle', entityType: 'MenuItem', entityId: item._id, before, after: item.toObject() });
  emitToRooms(['admin', 'staff', 'kitchen'], 'menu:stock_changed', {
    itemId: item._id,
    name: item.name,
    stockStatus: item.stockStatus,
    soundType: 'STOCK_SOUND',
    message: `${item.name} is now ${item.stockStatus}`
  });

  res.json({
    success: true,
    message: 'Menu stock updated',
    data: { item }
  });
});

export const deleteMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) throw new AppError('Menu item not found', 404);
  const before = item.toObject();
  await item.deleteOne();
  await auditLog({ req, action: 'menu_delete', entityType: 'MenuItem', entityId: item._id, before });

  res.json({
    success: true,
    message: 'Menu item deleted',
    data: {}
  });
});
