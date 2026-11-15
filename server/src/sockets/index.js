import { parse } from 'cookie';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { sha256 } from '../utils/security.js';

export function configureSockets(io, app) {
  io.use(async (socket, next) => {
    try {
      const token = parse(socket.handshake.headers.cookie || '')[env.SESSION_COOKIE_NAME];
      const session = token && await prisma.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
      if (!session || session.expiresAt <= new Date()) return next(new Error('unauthorized'));
      socket.user = session.user; next();
    } catch (error) { next(error); }
  });
  io.on('connection', (socket) => { socket.join(`user:${socket.user.id}`); if (socket.user.role === 'ADMIN') socket.join('admins'); });
  app.set('emitOrder', (order, isNew) => { io.to(`user:${order.userId}`).emit('order:updated', { orderId: order.id }); if (isNew) io.to('admins').emit('order:new', { orderId: order.id, totalAmount: order.totalAmount, createdAt: order.createdAt }); order.items.forEach((item) => io.emit('inventory:updated', { productId: item.productId })); });
  app.set('emitOrderStatus', (order) => io.to(`user:${order.userId}`).emit('order:updated', { orderId: order.id, status: order.status }));
  app.set('emitInventory', (product) => io.emit('inventory:updated', { productId: product.id }));
}
