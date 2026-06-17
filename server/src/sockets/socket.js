import { Server } from 'socket.io';
import { env } from '../config/env.js';

let io;

const roleRooms = {
  ADMIN: 'admin',
  STAFF: 'staff',
  KITCHEN: 'kitchen'
};

export const soundForSource = (source) => {
  const sounds = {
    WALKIN_TABLE: 'WALKIN_SOUND',
    TAKEAWAY_COUNTER: 'TAKEAWAY_SOUND',
    QR_TABLE: 'QR_SOUND',
    ONLINE_PICKUP: 'PICKUP_SOUND',
    ONLINE_DELIVERY: 'DELIVERY_SOUND',
    PAYMENT_UNDER_REVIEW: 'PAYMENT_SOUND',
    CALL_WAITER: 'WAITER_SOUND'
  };
  return sounds[source] || 'WALKIN_SOUND';
};

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: env.clientUrl,
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    socket.on('join', (payload = {}) => {
      const role = String(payload.role || '').toUpperCase();
      const room = roleRooms[role];
      if (room) socket.join(room);
    });

    socket.on('join:order', (payload = {}) => {
      const { orderNo, customerKey } = payload;
      if (orderNo) socket.join(`order:${orderNo}`);
      if (customerKey) socket.join(`customer:${customerKey}`);
    });

    socket.on('join:table', (payload = {}) => {
      const { tableId } = payload;
      if (tableId) socket.join(`table:${tableId}`);
    });
  });

  return io;
};

export const getIo = () => io;

export const emitToRooms = (rooms, event, payload) => {
  if (!io) return;
  rooms.forEach((room) => io.to(room).emit(event, payload));
};

export const emitOrderEvent = ({ event, order, rooms = ['admin', 'staff', 'kitchen'], soundType, message }) => {
  emitToRooms(rooms, event, {
    orderId: order._id,
    orderNo: order.orderNo,
    source: order.source,
    status: order.status,
    soundType: soundType || soundForSource(order.source),
    message
  });

  if (order.orderNo) {
    emitToRooms([`order:${order.orderNo}`], event, {
      orderId: order._id,
      orderNo: order.orderNo,
      source: order.source,
      status: order.status,
      soundType: soundType || soundForSource(order.source),
      message
    });
  }

  if (order.customerKey) {
    emitToRooms([`customer:${order.customerKey}`], event, {
      orderId: order._id,
      orderNo: order.orderNo,
      source: order.source,
      status: order.status,
      soundType: soundType || soundForSource(order.source),
      message
    });
  }
};
