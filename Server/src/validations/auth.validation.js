import { z } from 'zod';

export const loginSchema = {
  body: z
    .object({
      email: z
        .string({ required_error: 'Email is required' })
        .trim()
        .email('Invalid email address')
        .min(1, 'Email cannot be empty'),
      password: z
        .string({ required_error: 'Password is required' })
        .trim()
        .min(1, 'Password cannot be empty'),
    })
    .strict(),
};

export default {
  loginSchema,
};
