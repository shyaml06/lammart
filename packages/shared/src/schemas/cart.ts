import { z } from 'zod';

export const addToCartSchema = z.object({
  variantId: z.number().int().positive(),
  qty: z.number().int().positive(),
});
export type AddToCartInput = z.infer<typeof addToCartSchema>;

export const updateCartItemSchema = z.object({
  qty: z.number().int().positive(),
});
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
