import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { auditLog } from '../utils/auditLogger.js';

const signToken = (user) => {
  if (!env.jwtSecret) throw new AppError('JWT secret is not configured', 500);
  return jwt.sign({ id: user._id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  });
};

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+passwordHash');

  if (!user || !user.isActive) throw new AppError('Invalid email or password', 401);

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) throw new AppError('Invalid email or password', 401);

  const token = signToken(user);
  await auditLog({ req, action: 'login', entityType: 'User', entityId: user._id, after: { email: user.email, role: user.role } });

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: user.toSafeJSON()
    }
  });
});

export const logout = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    message: 'Logout successful',
    data: {}
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Current user loaded',
    data: { user: req.user }
  });
});
