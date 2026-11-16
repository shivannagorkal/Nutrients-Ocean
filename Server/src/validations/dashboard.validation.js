import { z } from 'zod';
import { isValidDateString } from '../utils/date.js';

export const dashboardRangeQuerySchema = z
  .object({
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'From date must be in YYYY-MM-DD format')
      .refine((val) => isValidDateString(val), 'Invalid calendar from date')
      .optional(),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'To date must be in YYYY-MM-DD format')
      .refine((val) => isValidDateString(val), 'Invalid calendar to date')
      .optional(),
    group: z.enum(['day', 'week', 'month']).optional().default('day'),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return data.from <= data.to;
      }
      return true;
    },
    {
      message: 'From date must be before or equal to To date',
      path: ['from'],
    }
  )
  .refine(
    (data) => {
      if (data.from && data.to) {
        const fromTime = new Date(data.from).getTime();
        const toTime = new Date(data.to).getTime();
        const maxSpanMs = 5 * 366 * 24 * 60 * 60 * 1000;
        return toTime - fromTime <= maxSpanMs;
      }
      return true;
    },
    {
      message: 'Date range cannot exceed 5 years',
      path: ['to'],
    }
  );
