import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { authenticate, csrfProtect } from '../middleware/auth.js';
import { loginSchema, registerSchema } from '../validators/schemas.js';
import * as auth from '../services/auth.service.js';
import { asyncHandler, created, ok } from '../utils/http.js';

export const authRouter = Router();
const limiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });
const cookieOptions = { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: env.COOKIE_SECURE ? 'none' : 'lax', maxAge: env.SESSION_TTL_DAYS * 86400000, path: '/' };
authRouter.post('/register', limiter, asyncHandler(async (req, res) => created(res, await auth.register(registerSchema.parse(req.body)))));
authRouter.post('/login', limiter, asyncHandler(async (req, res) => { const result = await auth.login(loginSchema.parse(req.body)); res.cookie(env.SESSION_COOKIE_NAME, result.token, cookieOptions); res.cookie('orderflow_csrf', result.csrfToken, { ...cookieOptions, httpOnly: false }); ok(res, { user: result.user, csrfToken: result.csrfToken }); }));
authRouter.get('/me', authenticate, (req, res) => ok(res, { user: auth.publicUser(req.user), csrfToken: req.get('x-csrf-token') || null }));
authRouter.post('/logout', authenticate, csrfProtect, asyncHandler(async (req, res) => { await prisma.session.delete({ where: { id: req.session.id } }); res.clearCookie(env.SESSION_COOKIE_NAME, cookieOptions); res.clearCookie('orderflow_csrf', { ...cookieOptions, httpOnly: false }); res.status(204).end(); }));
