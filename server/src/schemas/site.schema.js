import { z } from 'zod';
import { ROLE_VALUES } from '../constants/roles.js';
import {
  COMPLAINT_PRIORITY_VALUES,
  CONTENT_PAGE_STATUS_VALUES,
  SITE_SETTING_GROUP_VALUES,
  SUPPORT_CATEGORY_VALUES,
  SUPPORT_STATUS_VALUES,
  TEMPLATE_STATUS_VALUES,
  USER_ACCOUNT_STATUS_VALUES,
} from '../constants/siteAdministration.js';
import { PERMISSIONS } from '../constants/permissions.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid identifier is required.');
const emptyObject = z.object({}).default({});
const optionalText = (maximum) => z.string().trim().max(maximum).optional().default('');
const slug = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only.');
const settingKey = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/, 'Use lowercase letters, numbers, dots, underscores or hyphens.');

const settingValue = z.union([
  z.string().max(20000),
  z.number(),
  z.boolean(),
  z.array(z.string().trim().max(500)).max(100),
  z.record(z.string(), z.unknown()),
  z.null(),
]);

export const publicPageSchema = z.object({
  body: emptyObject,
  params: z.object({ slug }),
  query: emptyObject,
});

export const publicContactSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(180),
    email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
    telephone: optionalText(30),
    subject: z.string().trim().min(3).max(220),
    category: z.enum(SUPPORT_CATEGORY_VALUES),
    message: z.string().trim().min(20).max(8000),
    website: z.string().trim().max(0).optional().default(''),
  }),
  params: emptyObject,
  query: emptyObject,
});

export const publicComplaintSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(180),
    email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
    telephone: optionalText(30),
    subject: z.string().trim().min(3).max(220),
    message: z.string().trim().min(30).max(12000),
    relatedReference: optionalText(160),
    website: z.string().trim().max(0).optional().default(''),
  }),
  params: emptyObject,
  query: emptyObject,
});

export const adminSettingListSchema = z.object({
  body: emptyObject,
  params: emptyObject,
  query: z.object({
    group: z.enum(SITE_SETTING_GROUP_VALUES).optional(),
    search: optionalText(120),
  }),
});

export const upsertSettingSchema = z.object({
  body: z.object({
    key: settingKey,
    group: z.enum(SITE_SETTING_GROUP_VALUES),
    label: z.string().trim().min(2).max(160),
    description: optionalText(600),
    value: settingValue,
    valueType: z.enum(['string', 'number', 'boolean', 'string_array', 'json']),
    public: z.boolean().default(false),
  }),
  params: z.object({ key: settingKey }),
  query: emptyObject,
});

const sectionSchema = z.object({
  key: z.string().trim().min(1).max(100),
  heading: optionalText(220),
  body: optionalText(12000),
  callToActionLabel: optionalText(120),
  callToActionUrl: optionalText(500),
  order: z.coerce.number().int().min(0).max(1000).default(100),
  enabled: z.boolean().default(true),
});

const contentPageInput = z.object({
  slug,
  title: z.string().trim().min(2).max(220),
  eyebrow: optionalText(120),
  summary: optionalText(1000),
  body: optionalText(50000),
  sections: z.array(sectionSchema).max(40).default([]),
  seoTitle: optionalText(70),
  seoDescription: optionalText(180),
  status: z.enum(CONTENT_PAGE_STATUS_VALUES),
});

export const adminContentPageListSchema = z.object({
  body: emptyObject,
  params: emptyObject,
  query: z.object({
    status: z.enum(CONTENT_PAGE_STATUS_VALUES).optional(),
    search: optionalText(120),
  }),
});

export const createContentPageSchema = z.object({
  body: contentPageInput,
  params: emptyObject,
  query: emptyObject,
});

export const updateContentPageSchema = z.object({
  body: contentPageInput.partial(),
  params: z.object({ pageId: objectId }),
  query: emptyObject,
});

const emailTemplateInput = z.object({
  key: settingKey,
  name: z.string().trim().min(2).max(180),
  subject: z.string().trim().min(2).max(240),
  textBody: z.string().trim().min(10).max(30000),
  htmlBody: optionalText(50000),
  variables: z.array(z.string().trim().min(1).max(80)).max(80).default([]),
  status: z.enum(TEMPLATE_STATUS_VALUES),
});

const certificateTemplateInput = z.object({
  key: settingKey,
  name: z.string().trim().min(2).max(180),
  certificateType: z.enum(['member', 'training_provider', 'organization', 'course']),
  heading: z.string().trim().min(2).max(220),
  confirmationText: optionalText(600),
  footerText: optionalText(600),
  accentHex: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/),
  signatoryName: optionalText(180),
  signatoryTitle: optionalText(180),
  status: z.enum(TEMPLATE_STATUS_VALUES),
});

export const templateListSchema = z.object({
  body: emptyObject,
  params: emptyObject,
  query: z.object({
    type: z.enum(['email', 'certificate']).default('email'),
    status: z.enum(TEMPLATE_STATUS_VALUES).optional(),
    search: optionalText(120),
  }),
});

export const createEmailTemplateSchema = z.object({
  body: emailTemplateInput,
  params: emptyObject,
  query: emptyObject,
});

export const updateEmailTemplateSchema = z.object({
  body: emailTemplateInput.partial(),
  params: z.object({ templateId: objectId }),
  query: emptyObject,
});

export const createCertificateTemplateSchema = z.object({
  body: certificateTemplateInput,
  params: emptyObject,
  query: emptyObject,
});

export const updateCertificateTemplateSchema = z.object({
  body: certificateTemplateInput.partial(),
  params: z.object({ templateId: objectId }),
  query: emptyObject,
});

export const supportQueueSchema = z.object({
  body: emptyObject,
  params: emptyObject,
  query: z.object({
    kind: z.enum(['contact', 'complaint']).default('contact'),
    status: z.enum(SUPPORT_STATUS_VALUES).optional(),
    category: z.enum(SUPPORT_CATEGORY_VALUES).optional(),
    priority: z.enum(COMPLAINT_PRIORITY_VALUES).optional(),
    search: optionalText(120),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const supportUpdateSchema = z.object({
  body: z.object({
    status: z.enum(SUPPORT_STATUS_VALUES),
    assignedTo: z.union([objectId, z.literal(''), z.null()]).optional().default(null),
    priority: z.enum(COMPLAINT_PRIORITY_VALUES).optional(),
    internalNotes: optionalText(10000),
    responseSummary: optionalText(5000),
  }),
  params: z.object({ submissionId: objectId }),
  query: z.object({ kind: z.enum(['contact', 'complaint']).default('contact') }),
});

export const userListSchema = z.object({
  body: emptyObject,
  params: emptyObject,
  query: z.object({
    status: z.enum(USER_ACCOUNT_STATUS_VALUES).optional(),
    role: z.enum(ROLE_VALUES).optional(),
    search: optionalText(120),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const updateUserAdministrationSchema = z.object({
  body: z.object({
    accountStatus: z.enum(USER_ACCOUNT_STATUS_VALUES),
    roles: z.array(z.enum(ROLE_VALUES)).min(1),
    additionalPermissions: z
      .array(z.enum(Object.values(PERMISSIONS)))
      .max(Object.values(PERMISSIONS).length)
      .default([]),
    twoFactorEnforced: z.boolean().default(false),
    reason: z.string().trim().min(3).max(1000),
  }),
  params: z.object({ userId: objectId }),
  query: emptyObject,
});

export const roleListSchema = z.object({
  body: emptyObject,
  params: emptyObject,
  query: emptyObject,
});

export const updateRoleDefinitionSchema = z.object({
  body: z.object({
    label: z.string().trim().min(2).max(120),
    description: optionalText(600),
    additionalPermissions: z
      .array(z.enum(Object.values(PERMISSIONS)))
      .max(Object.values(PERMISSIONS).length)
      .default([]),
    active: z.boolean(),
  }),
  params: z.object({ role: z.enum(ROLE_VALUES) }),
  query: emptyObject,
});
