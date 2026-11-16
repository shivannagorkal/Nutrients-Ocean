import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function validateDate(val) {
  if (!val) return true;
  if (!dateRegex.test(val)) return false;
  const d = new Date(`${val}T00:00:00+05:30`);
  return !isNaN(d.getTime());
}

export const createProductSchema = {
  body: z
    .object({
      name: z.string({ required_error: 'Product name is required' }).trim().min(1, 'Product name is required').max(255),
      default_price: z.number().min(0, 'Default price cannot be negative').optional().nullable(),
      is_active: z.boolean().optional(),
    })
    .strict(),
};

export const updateProductSchema = {
  params: z
    .object({
      id: z.string().uuid('Invalid product ID'),
    })
    .strict(),
  body: z
    .object({
      name: z.string().trim().min(1, 'Product name cannot be empty').max(255).optional(),
      default_price: z.number().min(0, 'Default price cannot be negative').optional().nullable(),
      is_active: z.boolean().optional(),
    })
    .strict(),
};

export const getProductSchema = {
  params: z
    .object({
      id: z.string().uuid('Invalid product ID'),
    })
    .strict(),
};

export const createCategorySchema = {
  body: z
    .object({
      name: z.string({ required_error: 'Category name is required' }).trim().min(1, 'Category name is required').max(255),
    })
    .strict(),
};

export const updateCategorySchema = {
  params: z
    .object({
      id: z.string().uuid('Invalid category ID'),
    })
    .strict(),
  body: z
    .object({
      name: z.string({ required_error: 'Category name is required' }).trim().min(1, 'Category name is required').max(255),
    })
    .strict(),
};

export const getCategorySchema = {
  params: z
    .object({
      id: z.string().uuid('Invalid category ID'),
    })
    .strict(),
};

export const exportQuerySchema = {
  query: z
    .object({
      from: z.string().optional().refine(validateDate, { message: 'from must be a valid YYYY-MM-DD date' }),
      to: z.string().optional().refine(validateDate, { message: 'to must be a valid YYYY-MM-DD date' }),
    })
    .strict()
    .refine(
      (data) => {
        if (data.from && data.to) {
          return data.from <= data.to;
        }
        return true;
      },
      {
        message: 'from date must be less than or equal to to date',
        path: ['to'],
      }
    ),
};
