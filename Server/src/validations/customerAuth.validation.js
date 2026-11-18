import { z } from 'zod';

// Minimum 6 characters with uppercase, lowercase, number, and special character
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{6,}$/;

export const customerRegisterSchema = {
  body: z
    .object({
      phone: z
        .string({ required_error: 'Mobile number is required' })
        .transform((val) => val.replace(/\D/g, '').slice(-10))
        .refine((val) => /^[6-9]\d{9}$/.test(val), {
          message: 'Please enter a valid 10-digit mobile number',
        }),
      fullName: z
        .string({ required_error: 'Full name is required' })
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name cannot exceed 100 characters'),
      password: z
        .string({ required_error: 'Password is required' })
        .min(6, 'Password must be at least 6 characters')
        .regex(
          passwordRegex,
          'Password must contain at least 6 characters with one uppercase, lowercase, number, and special character'
        ),
    })
    .strict(),
};

export const customerLoginSchema = {
  body: z
    .object({
      phone: z
        .string({ required_error: 'Mobile number is required' })
        .transform((val) => val.replace(/\D/g, '').slice(-10))
        .refine((val) => /^\d{10}$/.test(val), {
          message: 'Please enter a valid 10-digit mobile number',
        }),
      password: z
        .string({ required_error: 'Password is required' })
        .min(1, 'Password cannot be empty'),
    })
    .strict(),
};

export default {
  customerRegisterSchema,
  customerLoginSchema,
};
