import { z } from 'zod';
export const registerSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.email().transform((v) => v.toLowerCase()), password: z.string().min(6).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/\d/) });
export const loginSchema = z.object({ email: z.email().transform((v) => v.toLowerCase()), password: z.string().min(1) });
export const productSchema = z.object({ name: z.string().trim().min(2).max(160), description: z.string().trim().min(10).max(5000), sku: z.string().trim().min(2).max(64).transform((v) => v.toUpperCase()), price: z.number().int().nonnegative(), stock: z.number().int().nonnegative(), imageUrl: z.url(), categoryId: z.uuid(), isActive: z.boolean().optional() });
export const categorySchema = z.object({ name: z.string().trim().min(2).max(80) });
export const cartItemSchema = z.object({ productId: z.uuid(), quantity: z.number().int().min(1).max(99) });
export const cartQuantitySchema = z.object({ quantity: z.number().int().min(1).max(99) });
export const checkoutSchema = z.object({ shippingAddress: z.object({ fullName: z.string().trim().min(2).max(100), line1: z.string().trim().min(4).max(160), line2: z.string().trim().max(160).optional(), city: z.string().trim().min(2).max(80), state: z.string().trim().min(2).max(80), postalCode: z.string().trim().min(3).max(16), country: z.string().trim().length(2).transform((v) => v.toUpperCase()) }) });
