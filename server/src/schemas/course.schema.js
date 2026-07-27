import { z } from 'zod';
import {
  COURSE_ADMIN_ACTION_VALUES,
  COURSE_CREDIT_UNIT_VALUES,
  COURSE_DELIVERY_METHOD_VALUES,
  COURSE_DOCUMENT_CATEGORY_VALUES,
  COURSE_REVIEW_CHECKLIST_KEYS,
  COURSE_REVIEW_NOTE_VISIBILITY_VALUES,
  COURSE_STATUS_VALUES,
} from '../constants/courseConstants.js';
import { DOCUMENT_REVIEW_ACTION_VALUES } from '../constants/documentStatuses.js';

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'A valid identifier is required.');

const optionalUrl = z.union([
  z.literal(''),
  z.string().trim().url().max(1000),
]);

const optionalEmail = z.union([
  z.literal(''),
  z.string().trim().email().max(254),
]);

const optionalDate = z
  .union([z.literal(''), z.string().trim()])
  .refine(
    (value) => !value || !Number.isNaN(Date.parse(value)),
    'A valid date is required.',
  );

const listField = (maximumItems, maximumLength) =>
  z
    .array(z.string().trim().min(1).max(maximumLength))
    .max(maximumItems)
    .default([]);

const instructorSchema = z.object({
  name: z.string().trim().min(2).max(160),
  qualifications: z.string().trim().max(1000).default(''),
  biography: z.string().trim().max(2000).default(''),
});

const draftBody = z.object({
  providerMembershipId: objectId,
  title: z.string().trim().min(3).max(240),
  category: z.string().trim().min(2).max(160),
  summary: z.string().trim().max(500).default(''),
  description: z.string().trim().max(10000).default(''),
  learningObjectives: listField(30, 500),
  targetAudience: listField(30, 300),
  prerequisites: listField(30, 300),
  deliveryMethods: z
    .array(z.enum([...COURSE_DELIVERY_METHOD_VALUES]))
    .max(3)
    .refine(
      (values) => new Set(values).size === values.length,
      'Delivery methods must be unique.',
    )
    .default([]),
  language: z.string().trim().max(80).default(''),
  totalLearningHours: z
    .union([z.number().min(0.5).max(10000), z.null()])
    .default(null),
  creditHours: z
    .union([z.number().min(0.5).max(10000), z.null()])
    .default(null),
  creditUnit: z
    .union([z.enum([...COURSE_CREDIT_UNIT_VALUES]), z.null()])
    .default(null),
  assessmentMethod: z.string().trim().max(3000).default(''),
  qualityAssurance: z.string().trim().max(3000).default(''),
  instructors: z.array(instructorSchema).max(50).default([]),
  scheduleText: z.string().trim().max(3000).default(''),
  priceMinor: z
    .union([z.number().int().min(0).max(1000000000), z.null()])
    .default(null),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  contactEmail: optionalEmail.default(''),
  websiteUrl: optionalUrl.default(''),
  publicVisible: z.boolean().default(true),
  declarationAccepted: z.boolean().default(false),
});

export const createCourseSchema = z.object({
  body: draftBody,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const updateCourseSchema = z.object({
  body: draftBody.omit({ providerMembershipId: true }),
  params: z.object({ courseId: objectId }),
  query: z.object({}).default({}),
});

export const courseIdSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({ courseId: objectId }),
  query: z.object({}).default({}),
});

export const listCourseDocumentsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({ courseId: objectId }),
  query: z.object({
    includeHistory: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .default('false'),
  }),
});

export const listSelfCoursesSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    status: z.enum([...COURSE_STATUS_VALUES]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

export const submitCourseSchema = z.object({
  body: z.object({
    confirmation: z.literal('SUBMIT'),
  }),
  params: z.object({ courseId: objectId }),
  query: z.object({}).default({}),
});

export const uploadCourseDocumentSchema = z.object({
  body: z.object({
    category: z.enum([...COURSE_DOCUMENT_CATEGORY_VALUES]),
    title: z.string().trim().min(2).max(160),
  }),
  params: z.object({ courseId: objectId }),
  query: z.object({}).default({}),
});

export const courseDocumentIdSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({ documentId: objectId }),
  query: z.object({
    disposition: z.enum(['inline', 'attachment']).default('inline'),
  }),
});

export const listAdminCoursesSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().max(160).optional().default(''),
    status: z.enum([...COURSE_STATUS_VALUES]).optional(),
    assignment: z.enum(['all', 'mine', 'unassigned']).default('all'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

export const assignCourseReviewerSchema = z.object({
  body: z.object({
    reviewerId: z.union([objectId, z.null()]),
    dueAt: optionalDate.default(''),
  }),
  params: z.object({ courseId: objectId }),
  query: z.object({}).default({}),
});

export const updateCourseChecklistSchema = z.object({
  body: z
    .object(
      Object.fromEntries(
        COURSE_REVIEW_CHECKLIST_KEYS.map((key) => [key, z.boolean()]),
      ),
    )
    .strict(),
  params: z.object({ courseId: objectId }),
  query: z.object({}).default({}),
});

export const addCourseReviewNoteSchema = z.object({
  body: z.object({
    visibility: z.enum([...COURSE_REVIEW_NOTE_VISIBILITY_VALUES]),
    body: z.string().trim().min(2).max(3000),
  }),
  params: z.object({ courseId: objectId }),
  query: z.object({}).default({}),
});

export const requestCourseInformationSchema = z.object({
  body: z.object({
    requestedFields: z
      .array(z.string().trim().min(1).max(120))
      .min(1)
      .max(50),
    reason: z.string().trim().min(2).max(1000),
    providerVisibleNote: z.string().trim().min(10).max(3000),
    internalNote: z.string().trim().max(3000).default(''),
  }),
  params: z.object({ courseId: objectId }),
  query: z.object({}).default({}),
});

export const approveCourseSchema = z.object({
  body: z.object({
    confirmation: z.literal('APPROVE'),
    reason: z.string().trim().max(1000).default(''),
    providerVisibleNote: z.string().trim().max(3000).default(''),
    internalNote: z.string().trim().max(3000).default(''),
  }),
  params: z.object({ courseId: objectId }),
  query: z.object({}).default({}),
});

export const rejectCourseSchema = z.object({
  body: z.object({
    confirmation: z.literal('REJECT'),
    reason: z.string().trim().min(2).max(1000),
    providerVisibleNote: z.string().trim().min(10).max(3000),
    internalNote: z.string().trim().max(3000).default(''),
  }),
  params: z.object({ courseId: objectId }),
  query: z.object({}).default({}),
});

export const coursePolicySchema = z.object({
  body: z.object({
    validityMonths: z.coerce.number().int().min(1).max(120),
    accreditationPrefix: z
      .string()
      .trim()
      .min(2)
      .max(12)
      .regex(/^[A-Z0-9]+$/)
      .transform((value) => value.toUpperCase()),
    certificatePrefix: z
      .string()
      .trim()
      .min(2)
      .max(12)
      .regex(/^[A-Z0-9]+$/)
      .transform((value) => value.toUpperCase()),
    authorizedSignatory: z.object({
      name: z.string().trim().min(2).max(160),
      title: z.string().trim().min(2).max(160),
    }),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const reviewCourseDocumentSchema = z.object({
  body: z
    .object({
      action: z.enum([...DOCUMENT_REVIEW_ACTION_VALUES]),
      providerVisibleNote: z.string().trim().max(2000).default(''),
      internalNote: z.string().trim().max(2000).default(''),
      reason: z.string().trim().max(1000).default(''),
    })
    .superRefine((value, context) => {
      if (
        ['reject', 'request_replacement'].includes(value.action) &&
        value.providerVisibleNote.length < 10
      ) {
        context.addIssue({
          code: 'custom',
          path: ['providerVisibleNote'],
          message:
            'A provider-visible explanation of at least ten characters is required.',
        });
      }
    }),
  params: z.object({ documentId: objectId }),
  query: z.object({}).default({}),
});

export const courseAdminActionSchema = z.object({
  body: z.object({
    action: z.enum([...COURSE_ADMIN_ACTION_VALUES]),
    confirmation: z.string().trim(),
    reason: z.string().trim().min(10).max(1000),
  }),
  params: z.object({ courseId: objectId }),
  query: z.object({}).default({}),
});

export const courseCertificateIdSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({ certificateId: objectId }),
  query: z.object({
    download: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .default('false'),
  }),
});

export const courseVerificationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    identifier: z.string().trim().min(3).max(160),
  }),
  query: z.object({}).default({}),
});
