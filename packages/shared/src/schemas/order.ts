import { z } from 'zod';

export const placeOrderSchema = z.object({
  addressId: z.number().int().positive(),
  paymentMethod: z.enum(['razorpay', 'cod']),
  billingGstin: z.string().optional(),
  notes: z.string().max(500).optional(),
});
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'pending',
    'paid',
    'confirmed',
    'packed',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
  ]),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
