import { z } from 'zod';

export const createCategorySchema = z.object({
  parentId: z.number().int().positive().nullable().optional(),
  name: z.string().min(1, 'Category name is required').max(150),
  slug: z.string().min(1).max(150).optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
