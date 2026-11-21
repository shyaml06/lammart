import { z } from 'zod';

export const createPincodeSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  isServiceable: z.boolean().default(true),
  deliveryDays: z.number().int().positive().optional(),
  baseCharge: z.number().int().min(0).default(0), // paise
  heavyChargePerUnit: z.number().int().min(0).default(0), // paise
  codAllowed: z.boolean().default(true),
});
export type CreatePincodeInput = z.infer<typeof createPincodeSchema>;

export const updatePincodeSchema = createPincodeSchema.partial();
export type UpdatePincodeInput = z.infer<typeof updatePincodeSchema>;
