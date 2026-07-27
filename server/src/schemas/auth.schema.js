import { z } from 'zod';
import { REGISTRATION_JOURNEY_VALUES } from '../constants/roles.js';

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z
  .string()
  .min(12, 'Password must contain at least 12 characters.')
  .max(128, 'Password cannot exceed 128 characters.')
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/[0-9]/, 'Password must include a number.')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character.');

export const registerSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: emailSchema,
    password: passwordSchema,
    journey: z.enum(REGISTRATION_JOURNEY_VALUES),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1).max(128),
  }),
});

export const tokenSchema = z.object({
  body: z.object({ token: z.string().trim().min(32).max(2048) }),
});

export const emailOnlySchema = z.object({
  body: z.object({ email: emailSchema }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().trim().min(32).max(2048),
    password: passwordSchema,
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
  }),
});

export const sessionIdSchema = z.object({
  params: z.object({ sessionId: z.string().trim().min(10).max(200) }),
});

export const requestEmailChangeSchema = z.object({
  body: z.object({
    newEmail: emailSchema,
    currentPassword: z.string().min(1).max(128),
  }),
});

export const twoFactorSchema = z.object({
  body: z.object({
    challenge: z.string().trim().min(32).max(2048),
    code: z.string().regex(/^\d{6}$/, 'Enter the six-digit verification code.'),
  }),
});
