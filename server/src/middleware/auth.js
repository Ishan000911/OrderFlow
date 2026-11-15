import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError, asyncHandler } from '../utils/http.js';
import { sha256 } from '../utils/security.js';

export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = req.cookies[env.SESSION_COOKIE_NAME];
  if (!token) throw new AppError(401, 'AUTH_REQUIRED', 'Please sign in to continue.');
  const session = await prisma.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!session || session.expiresAt <= new Date()) throw new AppError(401, 'SESSION_EXPIRED', 'Your session has expired.');
  req.session = session; req.user = session.user; next();
});

export const csrfProtect = (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!req.session || sha256(req.get('x-csrf-token') || '') !== req.session.csrfHash) return next(new AppError(403, 'CSRF_INVALID', 'Invalid CSRF token.'));
  next();
};
export const requireRole = (role) => (req, _res, next) => req.user?.role === role ? next() : next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
