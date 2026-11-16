import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function validateSettlementDate(val) {
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

export const createSettlementSchema = {
  body: z
    .object({
      settlement_date: z
        .string({ required_error: 'Settlement date is required' })
        .trim()
        .transform((val) => (val.includes('T') ? val.slice(0, 10) : val))
        .refine(validateSettlementDate, {
          message: 'Settlement date must be a valid YYYY-MM-DD date and cannot be more than 1 day in the future',
        }),
      amount: z
        .number({ required_error: 'Amount is required' })
        .min(0.01, 'Amount must be at least ₹0.01')
        .max(10000000, 'Amount cannot exceed ₹10,000,000'),
      paid_by: z.string({ required_error: 'Paid by member is required' }).uuid('Invalid member ID'),
      paid_to: z.string({ required_error: 'Paid to member is required' }).uuid('Invalid member ID'),
      notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional().nullable(),
    })
    .strict()
    .refine((data) => data.paid_by !== data.paid_to, {
      message: 'Paid By and Paid To cannot be the same member',
      path: ['paid_to'],
    }),
};

export const updateSettlementSchema = {
  params: z
    .object({
      id: z.string().uuid('Invalid settlement ID'),
    })
    .strict(),
  body: z
    .object({
      settlement_date: z
        .string()
        .trim()
        .transform((val) => (val.includes('T') ? val.slice(0, 10) : val))
        .refine(validateSettlementDate, {
          message: 'Settlement date must be a valid YYYY-MM-DD date and cannot be more than 1 day in the future',
        })
        .optional(),
      amount: z.number().min(0.01).max(10000000).optional(),
      paid_by: z.string().uuid('Invalid member ID').optional(),
      paid_to: z.string().uuid('Invalid member ID').optional(),
      notes: z.string().trim().max(500).optional().nullable(),
    })
    .strict()
    .refine(
      (data) => {
        if (data.paid_by && data.paid_to) {
          return data.paid_by !== data.paid_to;
        }
        return true;
      },
      {
        message: 'Paid By and Paid To cannot be the same member',
        path: ['paid_to'],
      }
    ),
};

export const getSettlementParamsSchema = {
  params: z
    .object({
      id: z.string().uuid('Invalid settlement ID'),
    })
    .strict(),
};

export default {
  createSettlementSchema,
  updateSettlementSchema,
  getSettlementParamsSchema,
};
