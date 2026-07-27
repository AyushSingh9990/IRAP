import { z } from 'zod';
import { DOCUMENT_CATEGORY_VALUES } from '../constants/documentCategories.js';
import {
  DOCUMENT_REVIEW_ACTION_VALUES,
  DOCUMENT_REVIEW_STATUS_VALUES,
} from '../constants/documentStatuses.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid identifier is required.');
const optionalIsoDate = z
  .string()
  .trim()
  .optional()
  .default('')
  .refine(
    (value) => !value || !Number.isNaN(Date.parse(value)),
    'A valid expiry date is required.',
  );

export const uploadDocumentSchema = z.object({
  body: z.object({
    applicationId: objectId,
    category: z.enum(DOCUMENT_CATEGORY_VALUES),
    title: z.string().trim().min(2).max(160),
    expiryDate: optionalIsoDate,
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const replaceDocumentSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(160).optional(),
    expiryDate: optionalIsoDate,
  }),
  params: z.object({ documentId: objectId }),
  query: z.object({}).default({}),
});

export const documentIdSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({ documentId: objectId }),
  query: z.object({}).default({}),
});

export const documentContentSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({ documentId: objectId }),
  query: z.object({
    disposition: z.enum(['inline', 'attachment']).default('inline'),
  }),
});

export const listDocumentsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    applicationId: objectId.optional(),
    includeHistory: z.enum(['true', 'false']).default('false'),
  }),
});

export const reviewQueueSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    status: z.enum(DOCUMENT_REVIEW_STATUS_VALUES).optional(),
    category: z.enum(DOCUMENT_CATEGORY_VALUES).optional(),
    applicationId: objectId.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

export const reviewDocumentSchema = z.object({
  body: z
    .object({
      action: z.enum(DOCUMENT_REVIEW_ACTION_VALUES),
      applicantVisibleNote: z.string().trim().max(2000).default(''),
      internalNote: z.string().trim().max(2000).default(''),
      reason: z.string().trim().max(1000).default(''),
    })
    .superRefine((value, context) => {
      if (
        ['reject', 'request_replacement'].includes(value.action) &&
        !value.applicantVisibleNote
      ) {
        context.addIssue({
          code: 'custom',
          path: ['applicantVisibleNote'],
          message: 'An applicant-visible explanation is required.',
        });
      }
    }),
  params: z.object({ documentId: objectId }),
  query: z.object({}).default({}),
});
