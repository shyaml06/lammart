import { z } from 'zod';

export const createBrandSchema = z.object({
  name: z.string().min(1, 'Brand name is required').max(100),
  slug: z.string().min(1).max(100).optional(),
  logo: z.string().optional(),
});
export type CreateBrandInput = z.infer<typeof createBrandSchema>;

export const updateBrandSchema = createBrandSchema.partial();
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
