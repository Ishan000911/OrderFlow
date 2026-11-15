import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/http.js';

const includeOrder = { items: true };
const retryable = (error) => error?.code === 'P2034' || error?.code === '40001' || error?.code === '40P01';
const payloadHash = (cart, shippingAddress) => crypto.createHash('sha256').update(JSON.stringify({ items: cart.map(({ productId, quantity }) => ({ productId, quantity })).sort((a, b) => a.productId.localeCompare(b.productId)), shippingAddress })).digest('hex');

export async function checkout(userId, key, shippingAddress) {
  if (!key || key.length < 8 || key.length > 128) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'A valid Idempotency-Key header is required.');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const cart = await tx.cartItem.findMany({ where: { userId }, select: { productId: true, quantity: true }, orderBy: { productId: 'asc' } });
        if (!cart.length) {
          const existing = await tx.order.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: key } }, include: includeOrder });
          if (existing) {
            const replayHash = payloadHash(existing.items.map(({ productId, quantity }) => ({ productId, quantity })), shippingAddress);
            if (existing.idempotencyHash !== replayHash) throw new AppError(409, 'IDEMPOTENCY_MISMATCH', 'This idempotency key was already used with a different checkout payload.');
            return { order: existing, replayed: true };
          }
          throw new AppError(400, 'EMPTY_CART', 'Your cart is empty.');
        }
        const hash = payloadHash(cart, shippingAddress);
        const existing = await tx.order.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: key } }, include: includeOrder });
        if (existing) {
          if (existing.idempotencyHash !== hash) throw new AppError(409, 'IDEMPOTENCY_MISMATCH', 'This idempotency key was already used with a different checkout payload.');
          return { order: existing, replayed: true };
        }
        const products = await tx.product.findMany({ where: { id: { in: cart.map((i) => i.productId) } } });
        const byId = new Map(products.map((p) => [p.id, p]));
        if (products.length !== cart.length || cart.some((i) => !byId.get(i.productId)?.isActive)) throw new AppError(409, 'PRODUCT_UNAVAILABLE', 'One or more products are unavailable.');
        for (const item of cart) {
          const changed = await tx.$executeRaw`UPDATE "Product" SET "stock" = "stock" - ${item.quantity}, "updatedAt" = NOW() WHERE "id" = ${item.productId}::uuid AND "isActive" = true AND "stock" >= ${item.quantity}`;
          if (changed !== 1) throw new AppError(409, 'INSUFFICIENT_STOCK', `${byId.get(item.productId).name} no longer has enough stock.`);
        }
        const totalAmount = cart.reduce((sum, i) => sum + byId.get(i.productId).price * i.quantity, 0);
        const order = await tx.order.create({ data: { userId, totalAmount, idempotencyKey: key, idempotencyHash: hash, shippingAddress, items: { create: cart.map((i) => ({ productId: i.productId, productName: byId.get(i.productId).name, unitPrice: byId.get(i.productId).price, quantity: i.quantity })) }, movements: { create: cart.map((i) => ({ productId: i.productId, quantityChange: -i.quantity, reason: 'CHECKOUT' })) } }, include: includeOrder });
        await tx.cartItem.deleteMany({ where: { userId } });
        return { order, replayed: false };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
    } catch (error) {
      if (error?.code === 'P2002') {
        const order = await prisma.order.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: key } }, include: includeOrder });
        if (order) {
          const replayHash = payloadHash(order.items.map(({ productId, quantity }) => ({ productId, quantity })), shippingAddress);
          if (order.idempotencyHash !== replayHash) throw new AppError(409, 'IDEMPOTENCY_MISMATCH', 'This idempotency key was already used with a different checkout payload.');
          return { order, replayed: true };
        }
      }
      if (!retryable(error) || attempt === 2) throw error;
    }
  }
}

export async function cancelOrder(orderId, actor) {
  return prisma.$transaction(async (tx) => {
    const changed = await tx.$executeRaw`UPDATE "Order" SET "status" = 'CANCELLED', "updatedAt" = NOW() WHERE "id" = ${orderId}::uuid AND (${actor.role} = 'ADMIN' OR "userId" = ${actor.id}::uuid) AND "status" IN ('PENDING', 'CONFIRMED')`;
    if (changed !== 1) {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order || (actor.role !== 'ADMIN' && order.userId !== actor.id)) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
      throw new AppError(409, 'ORDER_NOT_CANCELLABLE', 'This order can no longer be cancelled.');
    }
    const items = await tx.orderItem.findMany({ where: { orderId }, orderBy: { productId: 'asc' } });
    for (const item of items) await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
    await tx.inventoryMovement.createMany({ data: items.map((i) => ({ productId: i.productId, orderId, quantityChange: i.quantity, reason: 'CANCELLATION' })) });
    return tx.order.findUnique({ where: { id: orderId }, include: includeOrder });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
