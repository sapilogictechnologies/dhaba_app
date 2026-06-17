import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) throw new AppError('Authentication token is required', 401);
  if (!env.jwtSecret) throw new AppError('JWT secret is not configured', 500);

  const decoded = jwt.verify(token, env.jwtSecret);
  const user = await User.findById(decoded.id);

  if (!user || !user.isActive) {
    throw new AppError('User account is inactive or no longer exists', 401);
  }

  req.user = user;
  next();
});

/**
 * Like protect, but doesn't fail if no token.
 * Sets req.user if a valid token is present, otherwise req.user = null.
 */
export const optionalProtect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token || !env.jwtSecret) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.id);
    req.user = user?.isActive ? user : null;
  } catch {
    req.user = null;
  }

  next();
});
