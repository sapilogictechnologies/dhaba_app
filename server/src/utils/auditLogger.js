import AuditLog from '../models/AuditLog.js';

export const auditLog = async ({ req, action, entityType, entityId = null, before = null, after = null }) => {
  try {
    await AuditLog.create({
      userId: req.user?._id || null,
      role: req.user?.role || 'PUBLIC',
      action,
      entityType,
      entityId,
      before,
      after,
      ip: req.ip || req.headers['x-forwarded-for'] || ''
    });
  } catch (error) {
    console.error('Audit log failed:', error.message);
  }
};
