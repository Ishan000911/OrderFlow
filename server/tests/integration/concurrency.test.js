import 'dotenv/config';
import crypto from 'node:crypto';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { checkout, cancelOrder } from '../../src/services/order.service.js';

const prisma = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL } } });
let category, product, users;
beforeAll(async () => { category = await prisma.category.upsert({ where: { slug: 'test' }, update: {}, create: { name: 'Test', slug: 'test' } }); });
beforeEach(async () => {
  await prisma.inventoryMovement.deleteMany(); await prisma.orderItem.deleteMany(); await prisma.order.deleteMany(); await prisma.cartItem.deleteMany(); await prisma.session.deleteMany(); await prisma.product.deleteMany({ where: { categoryId: category.id } }); await prisma.user.deleteMany({ where: { email: { startsWith: 'race-' } } });
  product = await prisma.product.create({ data: { name: 'Final Unit', slug: `final-${crypto.randomUUID()}`, description: 'Concurrency integration fixture', sku: `RACE-${crypto.randomUUID()}`, price: 5000, stock: 1, imageUrl: 'https://example.com/item.jpg', categoryId: category.id } });
  users = await Promise.all([0, 1].map((i) => prisma.user.create({ data: { name: `Racer ${i}`, email: `race-${i}-${crypto.randomUUID()}@test.dev`, passwordHash: 'unused' } })));
  await prisma.cartItem.createMany({ data: users.map((user) => ({ userId: user.id, productId: product.id, quantity: 1 })) });
});
afterAll(() => prisma.$disconnect());
const address = { fullName: 'Test User', line1: '1 Test Lane', city: 'Pune', state: 'MH', postalCode: '411001', country: 'IN' };
describe('real PostgreSQL inventory concurrency', () => {
  it('allows exactly one buyer to purchase the final unit', async () => {
    const results = await Promise.allSettled(users.map((u) => checkout(u.id, crypto.randomUUID(), address)));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1); expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect((await prisma.product.findUnique({ where: { id: product.id } })).stock).toBe(0); expect(await prisma.order.count()).toBe(1);
  });
  it('replays the same idempotency key without a duplicate order', async () => {
    const key = crypto.randomUUID(); const first = await checkout(users[0].id, key, address); const second = await checkout(users[0].id, key, address);
    expect(second.order.id).toBe(first.order.id); expect(second.replayed).toBe(true); expect(await prisma.order.count({ where: { userId: users[0].id } })).toBe(1);
  });
  it('rejects reuse of an idempotency key with a different payload', async () => {
    const key = crypto.randomUUID(); await checkout(users[0].id, key, address);
    await expect(checkout(users[0].id, key, { ...address, city: 'Mumbai' })).rejects.toMatchObject({ code: 'IDEMPOTENCY_MISMATCH' });
  });
  it('rolls back every item when one product is out of stock', async () => {
    const unavailable = await prisma.product.create({ data: { name: 'Unavailable', slug: `unavailable-${crypto.randomUUID()}`, description: 'Rollback integration fixture', sku: `ROLL-${crypto.randomUUID()}`, price: 1000, stock: 0, imageUrl: 'https://example.com/none.jpg', categoryId: category.id } });
    await prisma.cartItem.create({ data: { userId: users[0].id, productId: unavailable.id, quantity: 1 } });
    await expect(checkout(users[0].id, crypto.randomUUID(), address)).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' });
    expect((await prisma.product.findUnique({ where: { id: product.id } })).stock).toBe(1); expect(await prisma.order.count()).toBe(0); expect(await prisma.inventoryMovement.count()).toBe(0);
  });
  it('never oversells during a burst of concurrent checkouts', async () => {
    await prisma.product.update({ where: { id: product.id }, data: { stock: 3 } });
    const extra = await Promise.all([2, 3, 4, 5, 6, 7].map((i) => prisma.user.create({ data: { name: `Racer ${i}`, email: `race-${i}-${crypto.randomUUID()}@test.dev`, passwordHash: 'unused', cartItems: { create: { productId: product.id, quantity: 1 } } } })));
    const results = await Promise.allSettled([...users, ...extra].map((u) => checkout(u.id, crypto.randomUUID(), address)));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3); expect((await prisma.product.findUnique({ where: { id: product.id } })).stock).toBe(0); expect(await prisma.order.count()).toBe(3);
  });
  it('restores stock only once under simultaneous cancellation', async () => {
    const placed = await checkout(users[0].id, crypto.randomUUID(), address); const results = await Promise.allSettled([cancelOrder(placed.order.id, users[0]), cancelOrder(placed.order.id, users[0])]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1); expect((await prisma.product.findUnique({ where: { id: product.id } })).stock).toBe(1); expect(await prisma.inventoryMovement.count({ where: { orderId: placed.order.id, reason: 'CANCELLATION' } })).toBe(1);
  });
});
