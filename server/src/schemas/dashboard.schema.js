import { z } from 'zod';
import {
  NOTIFICATION_CATEGORY_VALUES,
} from '../constants/notificationConstants.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid identifier is required.');

function isValidTimeZone(value) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export const accountSettingsSchema = z.object({
  body: z.object({
    displayName: z.string().trim().min(2).max(160),
    telephone: z.string().trim().max(30).default(''),
    preferredLanguage: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/, 'A valid language tag is required.')
      .default('en'),
    timeZone: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .refine(isValidTimeZone, 'A valid IANA time zone is required.')
      .default('UTC'),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const notificationListSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    status: z.enum(['all', 'read', 'unread']).default('all'),
    category: z.enum(NOTIFICATION_CATEGORY_VALUES).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

export const notificationIdSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({ notificationId: objectId }),
  query: z.object({}).default({}),
});

export const notificationPreferenceSchema = z.object({
  body: z.object({
    inAppEnabled: z.boolean(),
    emailEnabled: z.boolean(),
    applicationUpdates: z.boolean(),
    paymentUpdates: z.boolean(),
    documentUpdates: z.boolean(),
    securityAlerts: z.boolean(),
    announcements: z.boolean(),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});
