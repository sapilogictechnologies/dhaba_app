import QRCode from 'qrcode';
import { env } from '../config/env.js';

export const buildTableQrPayload = (table) => {
  const url = new URL('/customer', env.clientUrl);
  url.searchParams.set('tableNumber', String(table.tableNumber));
  url.searchParams.set('token', table.token);
  return url.toString();
};

export const generateTableQrDataUrl = async (table) => {
  return QRCode.toDataURL(buildTableQrPayload(table), {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 280
  });
};
