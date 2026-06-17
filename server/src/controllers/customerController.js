import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Order from '../models/Order.js';
import { env } from '../config/env.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

const signToken = (user) => {
  if (!env.jwtSecret) throw new AppError('JWT secret is not configured', 500);
  return jwt.sign({ id: user._id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn || '30d'
  });
};

/* ─── Register ──────────────────────────────────────────────────────────── */
export const customerRegister = asyncHandler(async (req, res) => {
  const { name, phone, email, password } = req.body;

  if (!name?.trim())     throw new AppError('Name is required', 400);
  if (!phone?.trim())    throw new AppError('Phone number is required', 400);
  if (!password)         throw new AppError('Password is required', 400);
  if (password.length < 6) throw new AppError('Password must be at least 6 characters', 400);

  // Unique phone check
  const existing = await User.findOne({ phone: phone.trim(), role: 'CUSTOMER' });
  if (existing) throw new AppError('An account with this phone number already exists', 409);

  // Optional unique email
  if (email?.trim()) {
    const emailExists = await User.findOne({ email: email.trim().toLowerCase() });
    if (emailExists) throw new AppError('An account with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const userData = {
    name: name.trim(),
    phone: phone.trim(),
    passwordHash,
    role: 'CUSTOMER'
  };
  if (email?.trim()) userData.email = email.trim().toLowerCase();

  const user = await User.create(userData);

  const token = signToken(user);
  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: { token, user: user.toSafeJSON() }
  });
});

/* ─── Login ─────────────────────────────────────────────────────────────── */
export const customerLogin = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  if (!phone?.trim() || !password) throw new AppError('Phone and password are required', 400);

  const user = await User.findOne({ phone: phone.trim(), role: 'CUSTOMER' }).select('+passwordHash');
  if (!user || !user.isActive) throw new AppError('Invalid phone number or password', 401);

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) throw new AppError('Invalid phone number or password', 401);

  const token = signToken(user);
  res.json({
    success: true,
    message: 'Login successful',
    data: { token, user: user.toSafeJSON() }
  });
});

/* ─── Get Profile ───────────────────────────────────────────────────────── */
export const getCustomerProfile = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Profile loaded',
    data: { user: req.user.toSafeJSON() }
  });
});

/* ─── Update Profile ────────────────────────────────────────────────────── */
export const updateCustomerProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  const updates = {};

  if (name?.trim())  updates.name  = name.trim();
  if (email !== undefined) {
    if (email?.trim()) {
      const conflict = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: req.user._id } });
      if (conflict) throw new AppError('Email already in use', 409);
      updates.email = email.trim().toLowerCase();
    } else {
      // Unset email rather than setting to null (sparse index)
      await User.findByIdAndUpdate(req.user._id, { $unset: { email: 1 } });
    }
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
  res.json({
    success: true,
    message: 'Profile updated',
    data: { user: user.toSafeJSON() }
  });
});

/* ─── Change Password ───────────────────────────────────────────────────── */
export const changeCustomerPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) throw new AppError('Both current and new password are required', 400);
  if (newPassword.length < 6) throw new AppError('New password must be at least 6 characters', 400);

  const user = await User.findById(req.user._id).select('+passwordHash');
  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) throw new AppError('Current password is incorrect', 401);

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  res.json({ success: true, message: 'Password changed successfully', data: {} });
});

/* ─── Add Address ───────────────────────────────────────────────────────── */
export const addCustomerAddress = asyncHandler(async (req, res) => {
  const { label, addressText, landmark, lat, lng } = req.body;
  if (!addressText?.trim()) throw new AppError('Address text is required', 400);

  const user = await User.findById(req.user._id);
  if (user.addresses.length >= 5) throw new AppError('Maximum 5 saved addresses allowed', 400);

  user.addresses.push({ label: label?.trim() || 'Home', addressText: addressText.trim(), landmark: landmark?.trim() || '', lat: lat || null, lng: lng || null });
  await user.save();

  res.json({ success: true, message: 'Address added', data: { addresses: user.addresses } });
});

/* ─── Delete Address ────────────────────────────────────────────────────── */
export const deleteCustomerAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const before = user.addresses.length;
  user.addresses = user.addresses.filter((a) => String(a._id) !== req.params.addressId);
  if (user.addresses.length === before) throw new AppError('Address not found', 404);
  await user.save();

  res.json({ success: true, message: 'Address removed', data: { addresses: user.addresses } });
});

/* ─── My Orders ─────────────────────────────────────────────────────────── */
export const getCustomerOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ customerId: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({
    success: true,
    message: 'Orders loaded',
    data: { orders }
  });
});
