import AppError from '../utils/AppError.js';

export const allowRoles = (...roles) => (req, _res, next) => {
  if (!req.user) throw new AppError('Authentication is required', 401);
  if (req.user.role === 'ADMIN' || roles.includes(req.user.role)) return next();
  throw new AppError('You do not have permission for this action', 403);
};
