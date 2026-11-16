import { z } from 'zod';
import { getTodayISTDateString, offsetDate, isValidDateString } from '../utils/date.js';

export const todayQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((val) => isValidDateString(val), 'Invalid calendar date')
    .refine((val) => {
      const maxDate = offsetDate(getTodayISTDateString(), 1);
      return val <= maxDate;
    }, 'Date cannot be more than 1 day in the future')
    .optional(),
});
