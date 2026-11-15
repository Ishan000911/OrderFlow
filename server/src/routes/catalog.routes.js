import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { authenticate, csrfProtect, requireRole } from '../middleware/auth.js';
import { categorySchema, productSchema } from '../validators/schemas.js';
import { AppError, asyncHandler, created, ok } from '../utils/http.js';
import { slugify } from '../utils/security.js';

export const catalogRouter = Router();
const querySchema = z.object({ q: z.string().trim().max(100).optional(), category: z.string().optional(), minPrice: z.coerce.number().int().nonnegative().optional(), maxPrice: z.coerce.number().int().nonnegative().optional(), sort: z.enum(['newest', 'price_asc', 'price_desc', 'name']).default('newest'), page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(50).default(12) });
catalogRouter.get('/products', asyncHandler(async (req, res) => {
  const q = querySchema.parse(req.query); const where = { isActive: true, ...(q.q && { name: { contains: q.q, mode: 'insensitive' } }), ...(q.category && { category: { slug: q.category } }), ...((q.minPrice !== undefined || q.maxPrice !== undefined) && { price: { ...(q.minPrice !== undefined && { gte: q.minPrice }), ...(q.maxPrice !== undefined && { lte: q.maxPrice }) } }) };
  const orderBy = q.sort === 'price_asc' ? { price: 'asc' } : q.sort === 'price_desc' ? { price: 'desc' } : q.sort === 'name' ? { name: 'asc' } : { createdAt: 'desc' };
  const [items, total] = await prisma.$transaction([prisma.product.findMany({ where, include: { category: true }, orderBy, skip: (q.page - 1) * q.limit, take: q.limit }), prisma.product.count({ where })]);
  ok(res, items, { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) });
}));
catalogRouter.get('/products/:id', asyncHandler(async (req, res) => { const identity = req.params.id.match(/^[0-9a-f-]{36}$/i) ? { id: req.params.id } : { slug: req.params.id }; const item = await prisma.product.findFirst({ where: { ...identity, isActive: true }, include: { category: true } }); if (!item) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.'); ok(res, item); }));
catalogRouter.get('/categories', asyncHandler(async (_req, res) => ok(res, await prisma.category.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { products: true } } } }))));
catalogRouter.post('/categories', authenticate, csrfProtect, requireRole('ADMIN'), asyncHandler(async (req, res) => { const input = categorySchema.parse(req.body); created(res, await prisma.category.create({ data: { ...input, slug: slugify(input.name) } })); }));
catalogRouter.patch('/categories/:id', authenticate, csrfProtect, requireRole('ADMIN'), asyncHandler(async (req, res) => { const input = categorySchema.parse(req.body); ok(res, await prisma.category.update({ where: { id: req.params.id }, data: { ...input, slug: slugify(input.name) } })); }));
catalogRouter.post('/products', authenticate, csrfProtect, requireRole('ADMIN'), asyncHandler(async (req, res) => { const input = productSchema.parse(req.body); created(res, await prisma.product.create({ data: { ...input, slug: `${slugify(input.name)}-${input.sku.toLowerCase()}` }, include: { category: true } })); }));
catalogRouter.patch('/products/:id', authenticate, csrfProtect, requireRole('ADMIN'), asyncHandler(async (req, res) => { const input = productSchema.partial().parse(req.body); ok(res, await prisma.product.update({ where: { id: req.params.id }, data: { ...input, ...(input.name && { slug: `${slugify(input.name)}-${(input.sku || req.params.id).toLowerCase()}` }) }, include: { category: true } })); }));
