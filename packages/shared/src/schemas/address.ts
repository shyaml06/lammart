import { z } from 'zod';

export const createAddressSchema = z.object({
  label: z.string().max(50).optional(),
  fullName: z.string().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
  line1: z.string().min(5).max(300),
  line2: z.string().max(300).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
  isDefault: z.boolean().default(false),
});
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
