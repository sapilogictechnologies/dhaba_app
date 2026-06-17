const escapeCsv = (value) => {
  const safe = value === null || value === undefined ? '' : String(value);
  return `"${safe.replace(/"/g, '""')}"`;
};

export const ordersToCsv = (orders) => {
  const columns = [
    'orderNo',
    'date',
    'source',
    'status',
    'customerName',
    'customerPhone',
    'subtotal',
    'deliveryCharge',
    'total',
    'paymentMethod',
    'paymentStatus',
    'paidAmount',
    'balanceAmount'
  ];

  const rows = orders.map((order) => [
    order.orderNo,
    order.createdAt?.toISOString?.() || '',
    order.source,
    order.status,
    order.customerName,
    order.customerPhone,
    order.subtotal,
    order.deliveryCharge,
    order.total,
    order.payment?.method,
    order.payment?.paymentStatus,
    order.payment?.paidAmount,
    order.payment?.balanceAmount
  ]);

  return [columns, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
};
