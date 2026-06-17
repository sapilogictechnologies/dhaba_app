import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import Order from '../models/Order.js';
import Table from '../models/Table.js';
import MenuItem from '../models/MenuItem.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { auditLog } from '../utils/auditLogger.js';
import { getSettingsDocument } from './settingsController.js';
import { calculateEtaMinutes } from '../utils/etaCalculator.js';
import { assertDeliveryPaymentEvidence, calculatePaymentStatus, validatePaymentAmount } from '../utils/paymentRules.js';
import { generateBillNumber, generateOrderAndKotNumbers } from '../utils/generateNumbers.js';
import { canCancel, canTransition, kitchenActiveStatuses, pushStatusHistory } from '../utils/orderStateMachine.js';
import { emitOrderEvent, emitToRooms, soundForSource } from '../sockets/socket.js';
import { env } from '../config/env.js';

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseJsonField = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeOrderBody = (req) => {
  const body = { ...req.body };
  body.items = parseJsonField(body.items, []);
  body.delivery = parseJsonField(body.delivery, body.delivery || {});
  body.payment = parseJsonField(body.payment, body.payment || {});
  return body;
};

const proofImageUrlFor = (file) => (file ? `/uploads/payment-proofs/${file.filename}` : '');

const customerKey = () => crypto.randomBytes(10).toString('hex');

const getTableForOrder = async ({ tableId, tableNumber, requireAvailable = true }) => {
  const filter = tableId ? { _id: tableId } : { tableNumber: Number(tableNumber) };
  const table = await Table.findOne(filter);
  if (!table || !table.isActive) throw new AppError('Active table not found', 404);
  if (requireAvailable && table.currentOrderId) throw new AppError('Table already has an active order', 400);
  return table;
};

const resolveOrderItems = async (items, { enforceAvailability }) => {
  if (!Array.isArray(items) || items.length === 0) throw new AppError('Order must include at least one item', 400);

  const itemIds = items.map((item) => item.itemId).filter(Boolean);
  const menuItems = await MenuItem.find({ _id: { $in: itemIds } });
  const menuMap = new Map(menuItems.map((item) => [String(item._id), item]));

  const orderItems = [];
  const kotItemsSnapshot = [];
  const etaItems = [];
  let subtotal = 0;

  for (const payload of items) {
    const menuItem = menuMap.get(String(payload.itemId));
    if (!menuItem) throw new AppError('One or more menu items were not found', 404);

    const qty = asNumber(payload.qty, 0);
    if (qty <= 0) throw new AppError('Quantity must be greater than zero', 400);

    if (enforceAvailability && (!menuItem.isAvailable || menuItem.stockStatus === 'OUT_OF_STOCK')) {
      throw new AppError(`${menuItem.name} is not available`, 400);
    }

    const itemNotes = payload.itemNotes || '';
    subtotal += menuItem.price * qty;
    orderItems.push({
      itemId: menuItem._id,
      nameSnapshot: menuItem.name,
      priceSnapshot: menuItem.price,
      qty,
      itemNotes,
      itemStatus: 'PENDING'
    });
    kotItemsSnapshot.push({
      itemId: menuItem._id,
      nameSnapshot: menuItem.name,
      qty,
      itemNotes
    });
    etaItems.push({ prepTimeMinutes: menuItem.prepTimeMinutes });
  }

  return { orderItems, kotItemsSnapshot, etaItems, subtotal };
};

const getDeliveryCharge = (settings, deliveryType, distanceInput, subtotal) => {
  if (deliveryType !== 'DELIVERY') return { distanceBucket: 'NA', distanceKm: null, deliveryCharge: 0 };
  if (!settings.deliveryEnabled) throw new AppError('Delivery is currently disabled', 400);
  if (subtotal < settings.minDeliveryOrderAmount) {
    throw new AppError(`Delivery requires a minimum order of ₹${settings.minDeliveryOrderAmount}`, 400);
  }

  const maxKm = settings.maxDeliveryDistanceKm || 3;
  const perKm = settings.deliveryChargePerKm || 20;

  if (typeof distanceInput === 'number' && distanceInput > 0) {
    if (distanceInput > maxKm) {
      throw new AppError(`Delivery is only available within ${maxKm} km. Your location is ${distanceInput} km away.`, 400);
    }
    const deliveryCharge = Math.ceil(distanceInput * perKm);
    return { distanceBucket: 'NA', distanceKm: distanceInput, deliveryCharge };
  }

  const bucket = distanceInput;
  if (bucket === 'ABOVE_10' || bucket === 'NA') throw new AppError(`Delivery is only available within ${maxKm} km`, 400);
  if (bucket === 'WITHIN_5') return { distanceBucket: 'WITHIN_5', distanceKm: null, deliveryCharge: settings.deliveryCharges?.within5km || 50 };
  if (bucket === 'BETWEEN_5_10') return { distanceBucket: 'BETWEEN_5_10', distanceKm: null, deliveryCharge: settings.deliveryCharges?.between5to10km || 100 };
  throw new AppError('Valid delivery distance is required (in km)', 400);
};

const totalsFor = ({ subtotal, discount = 0, tax = 0, deliveryCharge = 0 }) => {
  const cleanDiscount = asNumber(discount, 0);
  const cleanTax = asNumber(tax, 0);
  const total = Math.max(0, subtotal - cleanDiscount + cleanTax + deliveryCharge);
  return {
    subtotal,
    discount: cleanDiscount,
    tax: cleanTax,
    deliveryCharge,
    total
  };
};

const initialPayment = ({ total, payment = {}, status = 'UNPAID', proofImageUrl = '' }) => ({
  method: payment.method || (status === 'UNDER_REVIEW' ? 'UPI' : 'CASH'),
  paymentStatus: status,
  paidAmount: 0,
  balanceAmount: total,
  utr: payment.utr || '',
  proofImageUrl,
  rejectionReason: ''
});

const responseOrder = (res, statusCode, message, order) => {
  res.status(statusCode).json({
    success: true,
    message,
    data: { order }
  });
};

const emitKitchenNewOrder = (order) => {
  emitOrderEvent({
    event: 'order:new',
    order,
    rooms: ['admin', 'staff', 'kitchen'],
    soundType: soundForSource(order.source),
    message: `New ${order.source.replaceAll('_', ' ').toLowerCase()} order ${order.orderNo}`
  });
};

const createOrderDocument = async ({ req, source, deliveryType, status, table = null, body, proofImageUrl = '', enforceAvailability = false }) => {
  const settings = await getSettingsDocument();
  const { orderItems, kotItemsSnapshot, etaItems, subtotal } = await resolveOrderItems(body.items, { enforceAvailability });
  const deliveryInput = (body.delivery?.distanceKm != null && body.delivery.distanceKm !== '')
    ? asNumber(body.delivery.distanceKm, 0)
    : (body.delivery?.distanceBucket || 'NA');
  const { distanceBucket, distanceKm, deliveryCharge } = getDeliveryCharge(settings, deliveryType, deliveryInput, subtotal);
  const totals = totalsFor({ subtotal, discount: body.discount, tax: body.tax, deliveryCharge });
  const etaMinutesCalculated = await calculateEtaMinutes({ items: etaItems, distanceBucket });
  const numbers = await generateOrderAndKotNumbers(Order, settings);
  const delivery = {
    type: deliveryType,
    addressText: body.delivery?.addressText || '',
    landmark: body.delivery?.landmark || '',
    lat: body.delivery?.lat === undefined || body.delivery?.lat === '' ? null : asNumber(body.delivery.lat, null),
    lng: body.delivery?.lng === undefined || body.delivery?.lng === '' ? null : asNumber(body.delivery.lng, null),
    distanceBucket,
    distanceKm: distanceKm ?? null,
    etaMinutesCalculated,
    etaMinutesOverride: body.delivery?.etaMinutesOverride || null,
    scheduledPickupTime: body.delivery?.scheduledPickupTime || null
  };

  if (source === 'ONLINE_DELIVERY') {
    assertDeliveryPaymentEvidence({ utr: body.payment?.utr, proofImageUrl });
  }

  const paymentStatus = status === 'UNDER_REVIEW' ? 'UNDER_REVIEW' : 'UNPAID';
  const order = new Order({
    ...numbers,
    source,
    tableId: table?._id || null,
    tableNumber: table?.tableNumber || null,
    customerName: body.customerName || '',
    customerPhone: body.customerPhone || '',
    customerKey: body.customerKey || (source.startsWith('ONLINE') || source === 'QR_TABLE' ? customerKey() : ''),
    notes: body.notes || '',
    items: orderItems,
    kotCreatedAt: new Date(),
    kotItemsSnapshot,
    ...totals,
    delivery,
    payment: initialPayment({ total: totals.total, payment: body.payment, status: paymentStatus, proofImageUrl }),
    status
  });
  pushStatusHistory(order, status, req.user, 'Order created');
  await order.save();

  if (table) {
    table.currentOrderId = order._id;
    await table.save();
  }

  await auditLog({ req, action: 'order_create', entityType: 'Order', entityId: order._id, after: order.toObject() });
  return order;
};

const clearOrderTable = async (order) => {
  if (order.tableId) {
    await Table.updateOne({ _id: order.tableId, currentOrderId: order._id }, { $set: { currentOrderId: null } });
  }
};

export const expireStalePlacedOrders = async () => {
  const settings = await getSettingsDocument();
  const cutoff = new Date(Date.now() - settings.acceptanceWindowMinutes * 60 * 1000);
  const staleOrders = await Order.find({ status: 'PLACED', createdAt: { $lt: cutoff } }).limit(200);
  for (const order of staleOrders) {
    order.status = 'EXPIRED';
    pushStatusHistory(order, 'EXPIRED', null, 'Acceptance window expired');
    await order.save();
  }
};

export const createTableOrder = asyncHandler(async (req, res) => {
  const body = normalizeOrderBody(req);
  const table = await getTableForOrder({ tableId: body.tableId, tableNumber: body.tableNumber });
  const order = await createOrderDocument({
    req,
    source: 'WALKIN_TABLE',
    deliveryType: 'TABLE',
    status: 'ACCEPTED',
    table,
    body
  });
  emitKitchenNewOrder(order);
  responseOrder(res, 201, 'Table order created and sent to kitchen', order);
});

export const createTakeawayOrder = asyncHandler(async (req, res) => {
  const body = normalizeOrderBody(req);
  const order = await createOrderDocument({
    req,
    source: 'TAKEAWAY_COUNTER',
    deliveryType: 'TAKEAWAY',
    status: 'ACCEPTED',
    body
  });
  emitKitchenNewOrder(order);
  responseOrder(res, 201, 'Takeaway order created and sent to kitchen', order);
});

export const createPhoneOrder = asyncHandler(async (req, res) => {
  const body = normalizeOrderBody(req);
  const deliveryType = body.delivery?.type === 'DELIVERY' ? 'DELIVERY' : 'PICKUP';
  const order = await createOrderDocument({
    req,
    source: 'PHONE_MANUAL',
    deliveryType,
    status: 'ACCEPTED',
    body
  });
  emitKitchenNewOrder(order);
  responseOrder(res, 201, 'Phone order created and sent to kitchen', order);
});

export const createCustomerOrder = asyncHandler(async (req, res) => {
  const body = normalizeOrderBody(req);
  const proofImageUrl = proofImageUrlFor(req.file);
  let source = 'ONLINE_PICKUP';
  let deliveryType = body.delivery?.type === 'DELIVERY' ? 'DELIVERY' : 'PICKUP';
  let status = 'PLACED';
  let table = null;

  // Resolve customer identity from JWT (if logged in) or anonymous body fields
  let customerId = null;
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (bearerToken && env.jwtSecret) {
    try {
      const decoded = jwt.verify(bearerToken, env.jwtSecret);
      if (decoded?.id) customerId = decoded.id;
    } catch { /* anonymous */ }
  }

  if (body.tableNumber && body.token) {
    table = await Table.findOne({ tableNumber: Number(body.tableNumber), token: body.token, isActive: true });
    if (!table) throw new AppError('Invalid table QR token', 400);
    if (table.currentOrderId) throw new AppError('This table already has an active order', 400);
    source = 'QR_TABLE';
    deliveryType = 'TABLE';
    status = 'ACCEPTED';
  } else if (deliveryType === 'DELIVERY') {
    source = 'ONLINE_DELIVERY';
    status = 'UNDER_REVIEW';
  }

  const order = await createOrderDocument({
    req,
    source,
    deliveryType,
    status,
    table,
    body,
    proofImageUrl,
    enforceAvailability: true
  });

  // Link order to customer account if logged in
  if (customerId) {
    order.customerId = customerId;
    await order.save();
  }

  if (status === 'ACCEPTED') {
    emitKitchenNewOrder(order);
  } else if (status === 'UNDER_REVIEW') {
    emitOrderEvent({
      event: 'order:payment_under_review',
      order,
      rooms: ['admin', 'staff'],
      soundType: 'PAYMENT_SOUND',
      message: `Payment review required for ${order.orderNo}`
    });
  }

  responseOrder(res, 201, 'Customer order created', order);
});

export const getOrders = asyncHandler(async (req, res) => {
  await expireStalePlacedOrders();
  const filter = {};
  if (req.query.status) filter.status = { $in: String(req.query.status).split(',') };
  if (req.query.source) filter.source = req.query.source;
  if (req.query.date) {
    const start = new Date(`${req.query.date}T00:00:00.000Z`);
    const end = new Date(`${req.query.date}T23:59:59.999Z`);
    filter.createdAt = { $gte: start, $lte: end };
  }

  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(300);
  res.json({
    success: true,
    message: 'Orders loaded',
    data: { orders }
  });
});

export const getOrderById = asyncHandler(async (req, res) => {
  await expireStalePlacedOrders();
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  responseOrder(res, 200, 'Order loaded', order);
});

export const getPublicOrder = asyncHandler(async (req, res) => {
  await expireStalePlacedOrders();
  const order = await Order.findOne({ orderNo: req.params.orderNo });
  if (!order) throw new AppError('Order not found', 404);
  responseOrder(res, 200, 'Public order loaded', order);
});

export const getPublicMyOrders = asyncHandler(async (req, res) => {
  await expireStalePlacedOrders();

  // If customer JWT is present, use customerId for lookup
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (bearerToken && env.jwtSecret) {
    try {
      const decoded = jwt.verify(bearerToken, env.jwtSecret);
      if (decoded?.id) {
        const orders = await Order.find({ customerId: decoded.id }).sort({ createdAt: -1 }).limit(50);
        return res.json({ success: true, message: 'Customer orders loaded', data: { orders } });
      }
    } catch { /* fall through to phone+key */ }
  }

  // Anonymous fallback: phone + device key
  const phone = String(req.query.phone || '');
  const key = String(req.query.customerKey || '');
  if (!phone || !key) throw new AppError('Phone and customer key are required', 400);
  const orders = await Order.find({ customerPhone: phone, customerKey: key }).sort({ createdAt: -1 }).limit(50);
  res.json({
    success: true,
    message: 'Customer orders loaded',
    data: { orders }
  });
});

export const updateOrderItems = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  if (!canCancel(order.status)) throw new AppError('Closed, cancelled, or expired orders cannot be edited', 400);

  const before = order.toObject();
  const body = normalizeOrderBody(req);
  const settings = await getSettingsDocument();
  const { orderItems, kotItemsSnapshot, etaItems, subtotal } = await resolveOrderItems(body.items, { enforceAvailability: false });
  const updateDeliveryInput = order.delivery.distanceKm != null
    ? order.delivery.distanceKm
    : (order.delivery.distanceBucket || 'NA');
  const { deliveryCharge } = getDeliveryCharge(settings, order.delivery.type, updateDeliveryInput, subtotal);
  const totals = totalsFor({ subtotal, discount: body.discount ?? order.discount, tax: body.tax ?? order.tax, deliveryCharge });
  if (order.payment.paidAmount > totals.total) throw new AppError('Edited total cannot be less than already paid amount', 400);

  order.items = orderItems;
  order.kotItemsSnapshot = kotItemsSnapshot;
  order.kotCreatedAt = new Date();
  order.subtotal = totals.subtotal;
  order.discount = totals.discount;
  order.tax = totals.tax;
  order.deliveryCharge = totals.deliveryCharge;
  order.total = totals.total;
  order.payment.balanceAmount = totals.total - order.payment.paidAmount;
  order.payment.paymentStatus = calculatePaymentStatus(order.payment.paidAmount, totals.total);
  order.delivery.etaMinutesCalculated = await calculateEtaMinutes({ items: etaItems, distanceBucket: order.delivery.distanceBucket });
  await order.save();

  await auditLog({ req, action: 'item_edit', entityType: 'Order', entityId: order._id, before, after: order.toObject() });
  emitOrderEvent({ event: 'order:update', order, message: `Order ${order.orderNo} items updated` });
  responseOrder(res, 200, 'Order items updated', order);
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);

  const nextStatus = req.body.status;
  if (req.user.role === 'KITCHEN' && !['PREPARING', 'READY', 'COMPLETED'].includes(nextStatus)) {
    throw new AppError('Kitchen can only update preparing, ready, or completed statuses', 403);
  }
  if (nextStatus === 'CANCELLED') throw new AppError('Use the cancel endpoint with a reason', 400);
  if (!canTransition(order.status, nextStatus)) throw new AppError(`Status cannot move from ${order.status} to ${nextStatus}`, 400);
  if (nextStatus === 'CLOSED' && order.payment.paymentStatus !== 'PAID') {
    throw new AppError('Order must be fully paid before closing', 400);
  }

  const before = order.toObject();
  const settings = await getSettingsDocument();
  if (nextStatus === 'CLOSED' && !order.billNo) order.billNo = await generateBillNumber(Order, settings);
  order.status = nextStatus;
  if (nextStatus === 'PREPARING') order.items.forEach((item) => { if (item.itemStatus === 'PENDING') item.itemStatus = 'PREPARING'; });
  if (nextStatus === 'READY' || nextStatus === 'COMPLETED') order.items.forEach((item) => { if (item.itemStatus !== 'CANCELLED') item.itemStatus = 'READY'; });
  pushStatusHistory(order, nextStatus, req.user, req.body.note || '');
  await order.save();
  if (nextStatus === 'CLOSED') await clearOrderTable(order);

  await auditLog({ req, action: 'status_update', entityType: 'Order', entityId: order._id, before, after: order.toObject() });
  emitOrderEvent({ event: 'order:update', order, message: `Order ${order.orderNo} is ${nextStatus}` });
  responseOrder(res, 200, 'Order status updated', order);
});

export const acceptOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  if (!['PLACED', 'UNDER_REVIEW'].includes(order.status)) throw new AppError('Only placed or review orders can be accepted', 400);
  if (order.source === 'ONLINE_DELIVERY' && order.payment.paymentStatus !== 'PAID') {
    throw new AppError('Online delivery payment must be verified before accepting', 400);
  }

  const before = order.toObject();
  order.status = 'ACCEPTED';
  pushStatusHistory(order, 'ACCEPTED', req.user, req.body.note || 'Order accepted');
  await order.save();
  await auditLog({ req, action: 'status_update', entityType: 'Order', entityId: order._id, before, after: order.toObject() });
  emitKitchenNewOrder(order);
  responseOrder(res, 200, 'Order accepted and sent to kitchen', order);
});

export const rejectOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  if (!['PLACED', 'UNDER_REVIEW'].includes(order.status)) throw new AppError('Only placed or review orders can be rejected', 400);

  const before = order.toObject();
  order.status = 'CANCELLED';
  order.cancelReason = 'REJECTED';
  order.cancelReasonText = req.body.reason || 'Order rejected';
  order.cancelledBy = req.user._id;
  order.cancelledAt = new Date();
  pushStatusHistory(order, 'CANCELLED', req.user, order.cancelReasonText);
  await order.save();
  await clearOrderTable(order);
  await auditLog({ req, action: 'cancel_order', entityType: 'Order', entityId: order._id, before, after: order.toObject() });
  emitOrderEvent({ event: 'order:update', order, message: `Order ${order.orderNo} rejected` });
  responseOrder(res, 200, 'Order rejected', order);
});

export const updateEta = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  const before = order.toObject();
  order.delivery.etaMinutesOverride = req.body.etaMinutesOverride === null ? null : asNumber(req.body.etaMinutesOverride, order.delivery.etaMinutesOverride);
  await order.save();
  await auditLog({ req, action: 'eta_update', entityType: 'Order', entityId: order._id, before, after: order.toObject() });
  emitOrderEvent({ event: 'order:update', order, message: `ETA updated for ${order.orderNo}` });
  responseOrder(res, 200, 'ETA updated', order);
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  if (order.payment.paymentStatus !== 'UNDER_REVIEW') throw new AppError('Payment is not under review', 400);

  const before = order.toObject();
  order.payment.method = 'UPI';
  order.payment.paymentStatus = 'PAID';
  order.payment.paidAmount = order.total;
  order.payment.balanceAmount = 0;
  order.payment.verifiedBy = req.user._id;
  order.payment.verifiedAt = new Date();
  order.payment.rejectionReason = '';

  if (order.status === 'UNDER_REVIEW') {
    order.status = 'ACCEPTED';
    pushStatusHistory(order, 'ACCEPTED', req.user, 'Payment verified');
  }

  await order.save();
  await auditLog({ req, action: 'payment_verify', entityType: 'Order', entityId: order._id, before, after: order.toObject() });
  emitKitchenNewOrder(order);
  responseOrder(res, 200, 'Payment verified and order sent to kitchen', order);
});

export const rejectPayment = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  if (!req.body.reason) throw new AppError('Payment rejection reason is required', 400);

  const before = order.toObject();
  order.payment.paymentStatus = 'REJECTED';
  order.payment.rejectionReason = req.body.reason;
  order.payment.verifiedBy = req.user._id;
  order.payment.verifiedAt = new Date();
  await order.save();
  await auditLog({ req, action: 'payment_reject', entityType: 'Order', entityId: order._id, before, after: order.toObject() });
  emitOrderEvent({ event: 'order:update', order, rooms: ['admin', 'staff'], message: `Payment rejected for ${order.orderNo}` });
  responseOrder(res, 200, 'Payment rejected', order);
});

const closeOrderFromPayment = async (order, user) => {
  if (order.payment.paymentStatus !== 'PAID') throw new AppError('Order must be fully paid before closing', 400);
  const settings = await getSettingsDocument();
  if (!order.billNo) order.billNo = await generateBillNumber(Order, settings);

  if (order.status === 'READY') {
    const intermediate = order.delivery.type === 'PICKUP' ? 'PICKED_UP' : 'COMPLETED';
    order.status = intermediate;
    pushStatusHistory(order, intermediate, user, 'Closed from billing');
  } else if (order.status === 'OUT_FOR_DELIVERY') {
    order.status = 'DELIVERED';
    pushStatusHistory(order, 'DELIVERED', user, 'Closed from billing');
  } else if (!['DELIVERED', 'PICKED_UP', 'COMPLETED'].includes(order.status)) {
    throw new AppError('Order must be ready, delivered, picked up, or completed before closing', 400);
  }

  order.status = 'CLOSED';
  pushStatusHistory(order, 'CLOSED', user, 'Payment completed');
};

export const recordPayment = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  const before = order.toObject();
  const paidAmount = validatePaymentAmount(req.body.paidAmount, order.total);
  const settings = await getSettingsDocument();

  order.payment.method = req.body.method || order.payment.method;
  order.payment.paidAmount = paidAmount;
  order.payment.balanceAmount = order.total - paidAmount;
  order.payment.paymentStatus = calculatePaymentStatus(paidAmount, order.total);
  order.payment.utr = req.body.utr || order.payment.utr;
  if (!order.billNo) order.billNo = await generateBillNumber(Order, settings);

  if (req.body.closeOrder === true || req.body.closeOrder === 'true') {
    await closeOrderFromPayment(order, req.user);
  }

  await order.save();
  if (order.status === 'CLOSED') await clearOrderTable(order);
  await auditLog({ req, action: 'record_payment', entityType: 'Order', entityId: order._id, before, after: order.toObject() });
  emitOrderEvent({ event: 'order:update', order, message: `Payment recorded for ${order.orderNo}` });
  responseOrder(res, 200, 'Payment recorded', order);
});

export const moveTable = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  if (!order.tableId) throw new AppError('Only table orders can be moved', 400);
  if (!canCancel(order.status)) throw new AppError('Only active orders can be moved', 400);
  const targetTable = await getTableForOrder({ tableId: req.body.toTableId, tableNumber: req.body.toTableNumber });
  const before = order.toObject();

  const fromTableNumber = order.tableNumber;
  await Table.updateOne({ _id: order.tableId, currentOrderId: order._id }, { $set: { currentOrderId: null } });
  targetTable.currentOrderId = order._id;
  await targetTable.save();

  order.tableId = targetTable._id;
  order.tableNumber = targetTable.tableNumber;
  order.movedFromTable = fromTableNumber;
  order.movedToTable = targetTable.tableNumber;
  await order.save();
  await auditLog({ req, action: 'move_table', entityType: 'Order', entityId: order._id, before, after: order.toObject() });
  emitOrderEvent({ event: 'order:update', order, message: `Order moved to table ${targetTable.tableNumber}` });
  responseOrder(res, 200, 'Order moved to another table', order);
});

export const mergeOrders = asyncHandler(async (req, res) => {
  const source = await Order.findById(req.params.id);
  const target = await Order.findById(req.body.targetOrderId);
  if (!source || !target) throw new AppError('Source or target order not found', 404);
  if (String(source._id) === String(target._id)) throw new AppError('Cannot merge an order into itself', 400);
  if (!canCancel(source.status) || !canCancel(target.status)) throw new AppError('Only active orders can be merged', 400);
  if (source.payment.paidAmount > 0) throw new AppError('Paid source orders cannot be merged', 400);

  const before = { source: source.toObject(), target: target.toObject() };
  target.items.push(...source.items.map((item) => item.toObject()));
  target.kotItemsSnapshot = target.items.map((item) => ({
    itemId: item.itemId,
    nameSnapshot: item.nameSnapshot,
    qty: item.qty,
    itemNotes: item.itemNotes
  }));
  target.subtotal = target.items.reduce((sum, item) => sum + item.priceSnapshot * item.qty, 0);
  target.total = Math.max(0, target.subtotal - target.discount + target.tax + target.deliveryCharge);
  target.payment.balanceAmount = target.total - target.payment.paidAmount;
  target.payment.paymentStatus = calculatePaymentStatus(target.payment.paidAmount, target.total);
  target.mergeHistory.push({ mergedOrderId: source._id, orderNo: source.orderNo, mergedBy: req.user._id });

  source.status = 'CANCELLED';
  source.cancelReason = 'MERGED';
  source.cancelReasonText = `Merged into ${target.orderNo}`;
  source.cancelledBy = req.user._id;
  source.cancelledAt = new Date();
  pushStatusHistory(source, 'CANCELLED', req.user, source.cancelReasonText);

  await target.save();
  await source.save();
  await clearOrderTable(source);
  await auditLog({ req, action: 'merge_orders', entityType: 'Order', entityId: target._id, before, after: { source: source.toObject(), target: target.toObject() } });
  emitOrderEvent({ event: 'order:update', order: target, message: `${source.orderNo} merged into ${target.orderNo}` });
  responseOrder(res, 200, 'Orders merged', target);
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  if (!canCancel(order.status)) throw new AppError('Order cannot be cancelled from its current status', 400);
  if (!req.body.reason) throw new AppError('Cancellation reason is required', 400);

  const before = order.toObject();
  order.status = 'CANCELLED';
  order.cancelReason = req.body.reason;
  order.cancelReasonText = req.body.reasonText || req.body.reason;
  order.cancelledBy = req.user._id;
  order.cancelledAt = new Date();
  order.items.forEach((item) => { item.itemStatus = 'CANCELLED'; });
  pushStatusHistory(order, 'CANCELLED', req.user, order.cancelReasonText);
  await order.save();
  await clearOrderTable(order);
  await auditLog({ req, action: 'cancel_order', entityType: 'Order', entityId: order._id, before, after: order.toObject() });
  emitOrderEvent({ event: 'order:update', order, message: `Order ${order.orderNo} cancelled` });
  responseOrder(res, 200, 'Order cancelled', order);
});

export const callWaiter = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  if (order.tableNumber) {
    if (!req.body.token) throw new AppError('Table token is required to call waiter', 400);
    const table = await Table.findOne({ tableNumber: order.tableNumber, token: req.body.token, isActive: true });
    if (!table) throw new AppError('Invalid table token', 400);
  }

  emitToRooms(['admin', 'staff'], 'order:call_waiter', {
    orderId: order._id,
    orderNo: order.orderNo,
    source: order.source,
    status: order.status,
    soundType: 'WAITER_SOUND',
    message: `Waiter called for ${order.tableNumber ? `table ${order.tableNumber}` : order.orderNo}`
  });

  res.json({
    success: true,
    message: 'Waiter call sent',
    data: {}
  });
});

export const getKitchenStatuses = () => kitchenActiveStatuses;
