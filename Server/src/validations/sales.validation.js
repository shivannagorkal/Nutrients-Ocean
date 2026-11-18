import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// Check date is not more than 1 day in future in IST
function validateSaleDate(val) {
  if (typeof val !== 'string') return false;
  const dateStr = val.includes('T') ? val.slice(0, 10) : val;
  if (!dateRegex.test(dateStr)) return false;
  const targetDate = new Date(`${dateStr}T00:00:00+05:30`);
  if (isNaN(targetDate.getTime())) return false;

  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const maxFuture = new Date(nowIST);
  maxFuture.setDate(maxFuture.getDate() + 1);
  maxFuture.setHours(23, 59, 59, 999);

  return targetDate <= maxFuture;
}

export const createSaleSchema = {
  body: z
    .object({
      sale_date: z
        .string({ required_error: 'Sale date is required' })
        .trim()
        .transform((val) => (val.includes('T') ? val.slice(0, 10) : val))
        .refine(validateSaleDate, {
          message: 'Sale date must be a valid YYYY-MM-DD date and cannot be more than 1 day in the future',
        }),
      product_id: z.string({ required_error: 'Product is required' }).uuid('Invalid product ID'),
      quantity: z
        .number({ required_error: 'Quantity is required' })
        .int('Quantity must be an integer')
        .min(1, 'Quantity must be at least 1')
        .max(1000, 'Quantity cannot exceed 1000'),
      price_per_item: z.number().min(0, 'Price per item cannot be negative').optional().nullable(),
      total_amount: z
        .number({ required_error: 'Total amount is required' })
        .min(0.01, 'Total amount must be at least ₹0.01')
        .max(1000000, 'Total amount cannot exceed ₹1,000,000'),
      payment_method: z.enum(['UPI', 'Cash'], {
        required_error: 'Payment method is required',
        invalid_type_error: "Payment method must be either 'UPI' or 'Cash'",
      }),
      received_by: z.string({ required_error: 'Received by member is required' }).uuid('Invalid member ID'),
      notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional().nullable(),
    })
    .strict(),
};

export const updateSaleSchema = {
  params: z
    .object({
      id: z.string().uuid('Invalid sale ID'),
    })
    .strict(),
  body: z
    .object({
      sale_date: z
        .string()
        .trim()
        .transform((val) => (val.includes('T') ? val.slice(0, 10) : val))
        .refine(validateSaleDate, {
          message: 'Sale date must be a valid YYYY-MM-DD date and cannot be more than 1 day in the future',
        })
        .optional(),
      product_id: z.string().uuid('Invalid product ID').optional(),
      quantity: z.number().int().min(1).max(1000).optional(),
      price_per_item: z.number().min(0).optional().nullable(),
      total_amount: z.number().min(0.01).max(1000000).optional(),
      payment_method: z.enum(['UPI', 'Cash']).optional(),
      received_by: z.string().uuid('Invalid member ID').optional(),
      notes: z.string().trim().max(500).optional().nullable(),
    })
    .strict(),
};

export const getSaleParamsSchema = {
  params: z
    .object({
      id: z.string().uuid('Invalid sale ID'),
    })
    .strict(),
};

export const listSalesQuerySchema = {
  query: z
    .object({
      from: z.string().regex(dateRegex, 'Invalid from date format YYYY-MM-DD').optional(),
      to: z.string().regex(dateRegex, 'Invalid to date format YYYY-MM-DD').optional(),
      product: z.string().uuid('Invalid product filter ID').optional(),
      payment: z.enum(['UPI', 'Cash']).optional(),
      member: z.string().uuid('Invalid member filter ID').optional(),
      q: z.string().trim().optional(),
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
      sort: z.string().trim().optional(),
    })
    .strict(),
};

export const createSaleOrderSchema = {
  body: z
    .object({
      sale_date: z
        .string({ required_error: 'Sale date is required' })
        .trim()
        .transform((val) => (val.includes('T') ? val.slice(0, 10) : val))
        .refine(validateSaleDate, {
          message: 'Sale date must be a valid YYYY-MM-DD date and cannot be more than 1 day in the future',
        }),
      payment_method: z.enum(['UPI', 'Cash'], {
        required_error: 'Payment method is required',
        invalid_type_error: "Payment method must be either 'UPI' or 'Cash'",
      }),
      received_by: z.string({ required_error: 'Received by member is required' }).uuid('Invalid member ID'),
      customer_name: z.string().trim().max(255).optional().nullable(),
      customer_phone: z.string().trim().max(20).optional().nullable(),
      notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional().nullable(),
      items: z
        .array(
          z.object({
            product_id: z.string({ required_error: 'Product is required' }).uuid('Invalid product ID'),
            quantity: z
              .number({ required_error: 'Quantity is required' })
              .int('Quantity must be an integer')
              .min(1, 'Quantity must be at least 1')
              .max(1000, 'Quantity cannot exceed 1000'),
            price_per_item: z.number().min(0, 'Price per item cannot be negative').optional().nullable(),
            total_amount: z.number().min(0.01, 'Total amount must be at least ₹0.01').optional().nullable(),
            notes: z.string().trim().max(500).optional().nullable(),
          })
        )
        .min(1, 'Order must contain at least one item'),
    })
    .strict(),
};

export default {
  createSaleSchema,
  createSaleOrderSchema,
  updateSaleSchema,
  getSaleParamsSchema,
  listSalesQuerySchema,
};
