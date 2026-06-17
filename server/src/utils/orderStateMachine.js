export const allowedTransitions = {
  PLACED: ['UNDER_REVIEW', 'ACCEPTED', 'CANCELLED', 'EXPIRED'],
  UNDER_REVIEW: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['OUT_FOR_DELIVERY', 'PICKED_UP', 'COMPLETED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['CLOSED'],
  PICKED_UP: ['CLOSED'],
  COMPLETED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
  EXPIRED: []
};

export const activeStatuses = [
  'PLACED',
  'UNDER_REVIEW',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'PICKED_UP',
  'COMPLETED'
];

export const kitchenActiveStatuses = ['ACCEPTED', 'PREPARING', 'READY'];

export const canTransition = (from, to) => allowedTransitions[from]?.includes(to) || false;

export const assertTransition = (from, to) => {
  if (!canTransition(from, to)) {
    throw new Error(`Status cannot move from ${from} to ${to}`);
  }
};

export const canCancel = (status) => activeStatuses.includes(status);

export const pushStatusHistory = (order, status, user = null, note = '') => {
  order.statusHistory.push({
    status,
    changedBy: user?._id || null,
    role: user?.role || 'SYSTEM',
    note
  });
};
