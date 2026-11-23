import { z } from 'zod';

export const productFilterSchema = z.object({
  category: z.string().optional(),
  brand: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(['price_asc', 'price_desc', 'newest', 'name_asc']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(24),
  minPrice: z.coerce.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  maxPrice: z.coerce.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  // Dynamic filter attributes (thickness, finish, etc.)
}).passthrough();
export type ProductFilterInput = z.infer<typeof productFilterSchema>;

export const createProductSchema = z.object({
  categoryId: z.number().int().positive(),
  brandId: z.number().int().positive().optional(),
  name: z.string().min(1).max(300),
  description: z.string().optional(),
  hsnCode: z.string().optional(),
  gstRate: z.number().min(0).max(100).default(18),
  unit: z.enum(['piece', 'sheet', 'sqft', 'set']).default('piece'),
  isHeavy: z.boolean().default(false),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const createVariantSchema = z.object({
  productId: z.number().int().positive(),
  sku: z.string().min(1).max(50),
  designCode: z.string().optional(),
  optionLabel: z.string().optional(),
  price: z.number().int().positive(), // paise
  mrp: z.number().int().positive().optional(),
  stock: z.number().int().min(0).default(0),
  weightGrams: z.number().int().positive().optional(),
  moq: z.number().int().positive().default(1),
  attributes: z.record(z.string(), z.string()).optional(),
});
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
