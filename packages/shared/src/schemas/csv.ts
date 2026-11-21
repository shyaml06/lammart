import { z } from 'zod';

export const csvProductRowSchema = z
  .object({
    sku: z.string().min(1, 'SKU is required'),
    product_name: z.string().min(1, 'Product name is required'),
    category: z.string().min(1, 'Category is required'),
    brand: z.string().optional(),
    design_code: z.string().optional(),
    option_label: z.string().optional(),
    price: z.coerce.number().int().positive('Price must be a positive integer in paise'),
    mrp: z.coerce.number().int().positive().optional(),
    stock: z.coerce.number().int().min(0).default(0),
    hsn_code: z.string().optional(),
    gst_rate: z.coerce.number().min(0).max(100).optional().default(18),
    unit: z.enum(['piece', 'sheet', 'sqft', 'set']).optional().default('piece'),
    attr_thickness: z.string().optional(),
    attr_finish: z.string().optional(),
    image_filenames: z.string().optional(),
  })
  .passthrough();

export type CsvProductRowInput = z.infer<typeof csvProductRowSchema>;
