import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function validateExpenseDate(val) {
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

export const createExpenseSchema = {
  body: z
    .object({
      expense_date: z
        .string({ required_error: 'Expense date is required' })
        .trim()
        .transform((val) => (val.includes('T') ? val.slice(0, 10) : val))
        .refine(validateExpenseDate, {
          message: 'Expense date must be a valid YYYY-MM-DD date and cannot be more than 1 day in the future',
        }),
      category_id: z.string({ required_error: 'Category is required' }).uuid('Invalid category ID'),
      description: z
        .string({ required_error: 'Description is required' })
        .trim()
        .min(1, 'Description cannot be empty')
        .max(200, 'Description cannot exceed 200 characters'),
      amount: z
        .number({ required_error: 'Amount is required' })
        .min(0.01, 'Amount must be at least ₹0.01')
        .max(10000000, 'Amount cannot exceed ₹10,000,000'),
      payment_method: z.enum(['UPI', 'Cash', 'Personal Payment'], {
        required_error: 'Payment method is required',
        invalid_type_error: "Payment method must be 'UPI', 'Cash', or 'Personal Payment'",
      }),
      paid_by: z.string({ required_error: 'Paid by member is required' }).uuid('Invalid member ID'),
      expense_type: z.enum(['Regular Business Expense', 'Initial Investment'], {
        required_error: 'Expense type is required',
        invalid_type_error: "Expense type must be 'Regular Business Expense' or 'Initial Investment'",
      }),
      notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional().nullable(),
    })
    .strict(),
};

export const updateExpenseSchema = {
  params: z
    .object({
      id: z.string().uuid('Invalid expense ID'),
    })
    .strict(),
  body: z
    .object({
      expense_date: z
        .string()
        .trim()
        .transform((val) => (val.includes('T') ? val.slice(0, 10) : val))
        .refine(validateExpenseDate, {
          message: 'Expense date must be a valid YYYY-MM-DD date and cannot be more than 1 day in the future',
        })
        .optional(),
      category_id: z.string().uuid('Invalid category ID').optional(),
      description: z.string().trim().min(1).max(200).optional(),
      amount: z.number().min(0.01).max(10000000).optional(),
      payment_method: z.enum(['UPI', 'Cash', 'Personal Payment']).optional(),
      paid_by: z.string().uuid('Invalid member ID').optional(),
      expense_type: z.enum(['Regular Business Expense', 'Initial Investment']).optional(),
      notes: z.string().trim().max(500).optional().nullable(),
    })
    .strict(),
};

export const getExpenseParamsSchema = {
  params: z
    .object({
      id: z.string().uuid('Invalid expense ID'),
    })
    .strict(),
};

export const listExpensesQuerySchema = {
  query: z
    .object({
      from: z.string().regex(dateRegex, 'Invalid from date format YYYY-MM-DD').optional(),
      to: z.string().regex(dateRegex, 'Invalid to date format YYYY-MM-DD').optional(),
      category: z.string().uuid('Invalid category filter ID').optional(),
      type: z.enum(['Regular Business Expense', 'Initial Investment']).optional(),
      payment: z.enum(['UPI', 'Cash', 'Personal Payment']).optional(),
      member: z.string().uuid('Invalid member filter ID').optional(),
      q: z.string().trim().optional(),
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
      sort: z.string().trim().optional(),
    })
    .strict(),
};

export const createExpenseBillSchema = {
  body: z
    .object({
      expense_date: z
        .string({ required_error: 'Expense date is required' })
        .trim()
        .transform((val) => (val.includes('T') ? val.slice(0, 10) : val))
        .refine(validateExpenseDate, {
          message: 'Expense date must be a valid YYYY-MM-DD date and cannot be more than 1 day in the future',
        }),
      expense_type: z.enum(['Regular Business Expense', 'Initial Investment'], {
        required_error: 'Expense type is required',
        invalid_type_error: "Expense type must be 'Regular Business Expense' or 'Initial Investment'",
      }),
      payment_method: z.enum(['UPI', 'Cash', 'Personal Payment'], {
        required_error: 'Payment method is required',
        invalid_type_error: "Payment method must be 'UPI', 'Cash', or 'Personal Payment'",
      }),
      paid_by: z.string({ required_error: 'Paid by member is required' }).uuid('Invalid member ID'),
      notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional().nullable(),
      items: z
        .array(
          z.object({
            category_id: z.string({ required_error: 'Category is required' }).uuid('Invalid category ID'),
            description: z
              .string({ required_error: 'Description is required' })
              .trim()
              .min(1, 'Description cannot be empty')
              .max(200, 'Description cannot exceed 200 characters'),
            amount: z
              .number({ required_error: 'Amount is required' })
              .min(0.01, 'Amount must be at least ₹0.01')
              .max(10000000, 'Amount cannot exceed ₹10,000,000'),
            notes: z.string().trim().max(500).optional().nullable(),
          })
        )
        .min(1, 'Bill must contain at least one expense line'),
    })
    .strict(),
};

export default {
  createExpenseSchema,
  createExpenseBillSchema,
  updateExpenseSchema,
  getExpenseParamsSchema,
  listExpensesQuerySchema,
};
