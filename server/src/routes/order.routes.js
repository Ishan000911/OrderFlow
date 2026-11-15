import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { checkoutSchema } from '../validators/schemas.js';
import { AppError, asyncHandler, created, ok } from '../utils/http.js';
import { cancelOrder, checkout } from '../services/order.service.js';

export const orderRouter = Router(); orderRouter.use(authenticate);
orderRouter.post('/', asyncHandler(async (req, res) => { const input = checkoutSchema.parse(req.body); const result = await checkout(req.user.id, req.get('idempotency-key'), input.shippingAddress); req.app.get('emitOrder')?.(result.order, !result.replayed); if (result.replayed) return ok(res, { ...result.order, replayed: true }); created(res, result.order); }));
orderRouter.get('/', asyncHandler(async (req, res) => ok(res, await prisma.order.findMany({ where: { userId: req.user.id }, include: { items: true }, orderBy: { createdAt: 'desc' } }))));
orderRouter.get('/:id', asyncHandler(async (req, res) => { const order = await prisma.order.findFirst({ where: { id: req.params.id, ...(req.user.role !== 'ADMIN' && { userId: req.user.id }) }, include: { items: true } }); if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.'); ok(res, order); }));
orderRouter.post('/:id/cancel', asyncHandler(async (req, res) => { const order = await cancelOrder(req.params.id, req.user); req.app.get('emitOrderStatus')?.(order); ok(res, order); }));
