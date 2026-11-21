import { z } from 'zod';

export const createQuoteSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
  email: z.string().email().optional(),
  city: z.string().optional(),
  message: z.string().max(2000).optional(),
  items: z
    .array(
      z.object({
        variantId: z.number().int().positive().optional(),
        description: z.string().optional(),
        qty: z.number().int().positive(),
      })
    )
    .min(1),
});
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;

export const createSampleRequestSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
  address: z.string().min(5).max(500),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
  variantIds: z.array(z.number().int().positive()).min(1).max(5),
});
export type CreateSampleRequestInput = z.infer<typeof createSampleRequestSchema>;
