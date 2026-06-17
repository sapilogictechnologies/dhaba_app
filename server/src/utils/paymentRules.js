import AppError from './AppError.js';

export const calculatePaymentStatus = (paidAmount, total) => {
  if (paidAmount <= 0) return 'UNPAID';
  if (paidAmount < total) return 'PARTIAL';
  return 'PAID';
};

export const validatePaymentAmount = (paidAmount, total) => {
  const amount = Number(paidAmount);
  if (!Number.isFinite(amount)) throw new AppError('Paid amount must be a valid number', 400);
  if (amount < 0) throw new AppError('Paid amount cannot be negative', 400);
  if (amount > total) throw new AppError('Paid amount cannot exceed order total', 400);
  return amount;
};

export const assertDeliveryPaymentEvidence = ({ utr, proofImageUrl }) => {
  if (!utr && !proofImageUrl) {
    throw new AppError('Delivery orders require a UTR or payment proof screenshot', 400);
  }
};
