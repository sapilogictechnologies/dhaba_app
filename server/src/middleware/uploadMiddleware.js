import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { env } from '../config/env.js';
import AppError from '../utils/AppError.js';

const uploadRoot = path.resolve(process.cwd(), env.uploadDir, 'payment-proofs');
fs.mkdirSync(uploadRoot, { recursive: true });

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null, safeName);
  }
});

const fileFilter = (_req, file, cb) => {
  if (!allowedTypes.has(file.mimetype)) {
    cb(new AppError('Only jpg, jpeg, png, webp, and pdf files are allowed', 400));
    return;
  }
  cb(null, true);
};

export const uploadPaymentProof = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.maxFileSize }
}).single('proof');
