import 'dotenv/config';
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const categories = ['Audio', 'Desk Setup', 'Keyboards', 'Mobile', 'Travel', 'Wellness'];
const names = [
  ['Studio Pro Headphones', 'Audio'], ['Pocket Bluetooth Speaker', 'Audio'], ['USB-C Podcast Microphone', 'Audio'], ['Noise-Cancel Earbuds', 'Audio'], ['Walnut Monitor Stand', 'Desk Setup'], ['Aluminum Laptop Riser', 'Desk Setup'], ['Focus Desk Lamp', 'Desk Setup'], ['Felt Desk Mat', 'Desk Setup'], ['Mechanical Keyboard 75', 'Keyboards'], ['Low-Profile Keyboard', 'Keyboards'], ['Wireless Number Pad', 'Keyboards'], ['Artisan Keycap Set', 'Keyboards'], ['MagSafe Power Bank', 'Mobile'], ['Braided USB-C Cable', 'Mobile'], ['3-in-1 Charging Dock', 'Mobile'], ['Phone Tripod Stand', 'Mobile'], ['Commuter Backpack 24L', 'Travel'], ['Tech Organizer Pouch', 'Travel'], ['Insulated Travel Mug', 'Travel'], ['Compact Packing Cubes', 'Travel'], ['Smart Hydration Bottle', 'Wellness'], ['Posture Support Cushion', 'Wellness'], ['Digital Pomodoro Timer', 'Wellness'], ['Mini Massage Gun', 'Wellness'], ['Air Quality Monitor', 'Wellness'], ['Sleep Sound Machine', 'Wellness']
];
const productImages = [
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=80',
  'https://images.pexels.com/photos/21391577/pexels-photo-21391577.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
  'https://images.pexels.com/photos/19743300/pexels-photo-19743300.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
  'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80',
  'https://images.pexels.com/photos/30265373/pexels-photo-30265373.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
  'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80',
  'https://images.pexels.com/photos/38901232/pexels-photo-38901232.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
  'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?auto=format&fit=crop&w=900&q=80',
  'https://images.pexels.com/photos/10104285/pexels-photo-10104285.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
  'https://images.pexels.com/photos/3921633/pexels-photo-3921633.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
  'https://images.pexels.com/photos/10736999/pexels-photo-10736999.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
  'https://images.pexels.com/photos/13797092/pexels-photo-13797092.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80',
  'https://images.pexels.com/photos/7614386/pexels-photo-7614386.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
  'https://images.pexels.com/photos/32503350/pexels-photo-32503350.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
  'https://images.pexels.com/photos/18999368/pexels-photo-18999368.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
  'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=900&q=80',
  'https://images.pexels.com/photos/4790260/pexels-photo-4790260.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
  'https://images.pexels.com/photos/11372617/pexels-photo-11372617.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
  'https://images.pexels.com/photos/32079708/pexels-photo-32079708.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
  'https://images.unsplash.com/photo-1511295742362-92c96b1cf484?auto=format&fit=crop&w=900&q=80',
];
const image = (_name, i) => productImages[i];
const slugify = (v) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function main() {
  const passwordHash = await argon2.hash(process.env.ADMIN_PASSWORD || 'ChangeMe123!');
  const admin = await prisma.user.upsert({ where: { email: process.env.ADMIN_EMAIL || 'admin@orderflow.dev' }, update: {}, create: { name: 'Maya Admin', email: process.env.ADMIN_EMAIL || 'admin@orderflow.dev', passwordHash, role: 'ADMIN' } });
  for (const [i, email] of ['alex@orderflow.dev', 'priya@orderflow.dev', 'sam@orderflow.dev'].entries()) await prisma.user.upsert({ where: { email }, update: {}, create: { name: ['Alex Morgan', 'Priya Shah', 'Sam Lee'][i], email, passwordHash: await argon2.hash('Customer123!') } });
  const categoryMap = new Map();
  for (const name of categories) { const category = await prisma.category.upsert({ where: { slug: slugify(name) }, update: { name }, create: { name, slug: slugify(name) } }); categoryMap.set(name, category.id); }
  for (const [i, [name, category]] of names.entries()) await prisma.product.upsert({ where: { sku: `OF-${String(i + 1).padStart(4, '0')}` }, update: { imageUrl: image(name, i) }, create: { name, slug: `${slugify(name)}-${i + 1}`, description: `Thoughtfully designed ${name.toLowerCase()} for a calmer, more productive everyday setup. Built with dependable materials and a clean modern finish.`, sku: `OF-${String(i + 1).padStart(4, '0')}`, price: 1299 + i * 375, stock: i % 7 === 0 ? 2 : 8 + (i * 7) % 36, imageUrl: image(name, i), categoryId: categoryMap.get(category) } });
  const demoUsers = await prisma.user.findMany({ where: { email: { in: ['alex@orderflow.dev', 'priya@orderflow.dev', 'sam@orderflow.dev'] } }, orderBy: { email: 'asc' } });
  const products = await prisma.product.findMany({ where: { sku: { startsWith: 'OF-' } }, orderBy: { sku: 'asc' }, take: 8 });
  const statuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];
  for (const [i, status] of statuses.entries()) {
    const user = demoUsers[i % demoUsers.length]; const selected = [products[i], products[i + 1]]; const idempotencyKey = `seed-order-${i + 1}`;
    if (await prisma.order.findUnique({ where: { userId_idempotencyKey: { userId: user.id, idempotencyKey } } })) continue;
    await prisma.$transaction(async (tx) => {
      for (const product of selected) await tx.product.update({ where: { id: product.id }, data: { stock: { decrement: 1 } } });
      await tx.order.create({ data: { userId: user.id, status, idempotencyKey, idempotencyHash: crypto.createHash('sha256').update(idempotencyKey).digest('hex'), totalAmount: selected.reduce((sum, product) => sum + product.price, 0), shippingAddress: { fullName: user.name, line1: '42 Demo Avenue', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'IN' }, items: { create: selected.map((product) => ({ productId: product.id, productName: product.name, unitPrice: product.price, quantity: 1 })) }, movements: { create: selected.map((product) => ({ productId: product.id, quantityChange: -1, reason: 'CHECKOUT' })) } } });
    });
  }
  console.log(`Seeded OrderFlow. Admin: ${admin.email}; customer password: Customer123!`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
