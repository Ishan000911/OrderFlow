import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { authenticate, csrfProtect } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { authRouter } from './routes/auth.routes.js';
import { catalogRouter } from './routes/catalog.routes.js';
import { cartRouter } from './routes/cart.routes.js';
import { orderRouter } from './routes/order.routes.js';
import { adminRouter } from './routes/admin.routes.js';

export function createApp() {
  const app = express();
  if (env.TRUST_PROXY) app.set('trust proxy', 1);
  app.use(pinoHttp()); app.use(helmet()); app.use(cors({ origin: env.CLIENT_URL, credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Idempotency-Key'] })); app.use(express.json({ limit: '100kb' })); app.use(cookieParser());
  app.get('/api/v1/health', (_req, res) => res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } }));
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1', catalogRouter);
  app.use('/api/v1/cart', authenticate, csrfProtect, cartRouter);
  app.use('/api/v1/orders', authenticate, csrfProtect, orderRouter);
  app.use('/api/v1/admin', authenticate, csrfProtect, adminRouter);
  app.use(notFound); app.use(errorHandler); return app;
}
