import { z } from 'zod';
import { APPLICATION_TYPE_VALUES } from '../constants/applicationTypes.js';
import {
  MEMBERSHIP_ADMIN_ACTION_VALUES,
  MEMBERSHIP_STATUS_VALUES,
} from '../constants/membershipConstants.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid identifier is required.');
const prefix = z.string().trim().min(2).max(12).regex(/^[A-Za-z0-9]+$/).transform((value) => value.toUpperCase());

export const membershipIdSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({ membershipId: objectId }),
  query: z.object({}),
});

export const certificateIdSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({ certificateId: objectId }),
  query: z.object({}),
});

export const createRenewalApplicationSchema = z.object({
  body: z.object({}),
  params: z.object({ membershipId: objectId }),
  query: z.object({}),
});

export const membershipPolicySchema = z.object({
  body: z.object({
    validityMonths: z.object({
      member: z.coerce.number().int().min(1).max(120),
      trainingProvider: z.coerce.number().int().min(1).max(120),
      organization: z.coerce.number().int().min(1).max(120),
    }),
    renewalWindowDays: z.coerce.number().int().min(1).max(365),
    gracePeriodDays: z.coerce.number().int().min(0).max(365),
    reminderDays: z.array(z.coerce.number().int().min(0).max(365)).min(1).max(12)
      .refine((value) => new Set(value).size === value.length, 'Reminder offsets must be unique.'),
    registrationPrefixes: z.object({
      member: prefix,
      trainingProvider: prefix,
      organization: prefix,
    }),
    certificatePrefix: prefix,
    authorizedSignatory: z.object({
      name: z.string().trim().min(2).max(160),
      title: z.string().trim().min(2).max(160),
    }),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const adminMembershipListSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({}),
  query: z.object({
    type: z.enum([...APPLICATION_TYPE_VALUES, '']).optional().default(''),
    status: z.enum([...MEMBERSHIP_STATUS_VALUES, '']).optional().default(''),
    search: z.string().trim().max(160).optional().default(''),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  }),
});

export const issueMembershipSchema = z.object({
  body: z.object({ applicationId: objectId }),
  params: z.object({}),
  query: z.object({}),
});

export const membershipAdminActionSchema = z.object({
  body: z.object({
    action: z.enum(MEMBERSHIP_ADMIN_ACTION_VALUES),
    confirmation: z.string().trim(),
    reason: z.string().trim().min(10).max(1000),
  }),
  params: z.object({ membershipId: objectId }),
  query: z.object({}),
}).superRefine((value, context) => {
  const expected = value.body.action.toUpperCase();
  if (value.body.confirmation !== expected) {
    context.addIssue({
      code: 'custom',
      path: ['body', 'confirmation'],
      message: `Type ${expected} to confirm this action.`,
    });
  }
});

export const certificateAdminActionSchema = z.object({
  body: z.object({
    confirmation: z.string().trim(),
    reason: z.string().trim().min(10).max(1000),
  }),
  params: z.object({ certificateId: objectId }),
  query: z.object({}),
});

export const publicVerificationSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({ identifier: z.string().trim().min(3).max(160) }),
  query: z.object({}),
});

export const processRenewalsSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({}),
});
