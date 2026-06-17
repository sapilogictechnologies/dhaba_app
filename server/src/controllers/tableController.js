import crypto from 'crypto';
import Table from '../models/Table.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { auditLog } from '../utils/auditLogger.js';
import { generateTableQrDataUrl } from '../utils/qrGenerator.js';

const createToken = () => crypto.randomBytes(24).toString('hex');

export const getTables = asyncHandler(async (_req, res) => {
  const tables = await Table.find().sort({ tableNumber: 1 }).populate('currentOrderId', 'orderNo status total');
  res.json({
    success: true,
    message: 'Tables loaded',
    data: { tables }
  });
});

export const createTable = asyncHandler(async (req, res) => {
  const table = new Table({
    tableNumber: req.body.tableNumber,
    capacity: req.body.capacity || 4,
    token: createToken(),
    isActive: req.body.isActive !== undefined ? req.body.isActive : true
  });
  table.qrCodeUrl = await generateTableQrDataUrl(table);
  await table.save();
  await auditLog({ req, action: 'table_create', entityType: 'Table', entityId: table._id, after: table.toObject() });

  res.status(201).json({
    success: true,
    message: 'Table created',
    data: { table }
  });
});

export const updateTable = asyncHandler(async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table) throw new AppError('Table not found', 404);
  const before = table.toObject();

  ['tableNumber', 'capacity', 'isActive'].forEach((field) => {
    if (req.body[field] !== undefined) table[field] = req.body[field];
  });

  table.qrCodeUrl = await generateTableQrDataUrl(table);
  await table.save();
  await auditLog({ req, action: 'table_update', entityType: 'Table', entityId: table._id, before, after: table.toObject() });

  res.json({
    success: true,
    message: 'Table updated',
    data: { table }
  });
});

export const deleteTable = asyncHandler(async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table) throw new AppError('Table not found', 404);
  if (table.currentOrderId) throw new AppError('Cannot delete a table with an active order', 400);
  const before = table.toObject();
  await table.deleteOne();
  await auditLog({ req, action: 'table_delete', entityType: 'Table', entityId: table._id, before });

  res.json({
    success: true,
    message: 'Table deleted',
    data: {}
  });
});

export const generateTableQr = asyncHandler(async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table) throw new AppError('Table not found', 404);
  const before = table.toObject();
  table.token = createToken();
  table.qrCodeUrl = await generateTableQrDataUrl(table);
  await table.save();
  await auditLog({ req, action: 'qr_generate', entityType: 'Table', entityId: table._id, before, after: table.toObject() });

  res.json({
    success: true,
    message: 'Table QR generated',
    data: { table }
  });
});

export const validateTableQr = asyncHandler(async (req, res) => {
  const tableNumber = Number(req.query.tableNumber);
  const token = String(req.query.token || '');
  const table = await Table.findOne({ tableNumber, token, isActive: true });
  if (!table) throw new AppError('Invalid or inactive table QR', 400);

  res.json({
    success: true,
    message: 'Table QR is valid',
    data: { table }
  });
});
