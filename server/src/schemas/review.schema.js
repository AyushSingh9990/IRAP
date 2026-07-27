import { z } from 'zod';
import {
  APPLICATION_STATUS_VALUES,
} from '../constants/applicationStatuses.js';
import { APPLICATION_TYPE_VALUES } from '../constants/applicationTypes.js';
import { AUDIT_ACTION_VALUES, AUDIT_OUTCOME_VALUES } from '../constants/auditActions.js';
import {
  REVIEW_NOTE_VISIBILITY_VALUES,
  REVIEW_QUEUE_ASSIGNMENT_VALUES,
} from '../constants/reviewConstants.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid identifier is required.');
const optionalObjectId = z.union([objectId, z.literal('')]).optional().default('');
const optionalDate = z.union([z.string().datetime(), z.literal(''), z.null()]).optional();

export const reviewDashboardSchema = z.object({ body: z.object({}), params: z.object({}), query: z.object({}) });

export const reviewQueueSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    status: z.enum([...APPLICATION_STATUS_VALUES, '']).optional().default(''),
    type: z.enum([...APPLICATION_TYPE_VALUES, '']).optional().default(''),
    assignment: z.enum(REVIEW_QUEUE_ASSIGNMENT_VALUES).optional().default('all'),
    reviewerId: optionalObjectId,
    search: z.string().trim().max(160).optional().default(''),
    sortBy: z.enum(['submittedAt', 'updatedAt', 'reference', 'status']).optional().default('submittedAt'),
    sortDirection: z.enum(['asc', 'desc']).optional().default('asc'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

export const applicationReviewIdSchema = z.object({
  body: z.object({}),
  params: z.object({ applicationId: objectId }),
  query: z.object({}),
});

export const assignReviewerSchema = z.object({
  body: z.object({
    reviewerId: z.union([objectId, z.literal('')]),
    dueAt: optionalDate,
  }),
  params: z.object({ applicationId: objectId }),
  query: z.object({}),
});

export const bulkAssignReviewerSchema = z.object({
  body: z.object({
    applicationIds: z.array(objectId).min(1).max(50),
    reviewerId: z.union([objectId, z.literal('')]),
    dueAt: optionalDate,
  }),
  params: z.object({}),
  query: z.object({}),
});

export const addReviewNoteSchema = z.object({
  body: z.object({
    visibility: z.enum(REVIEW_NOTE_VISIBILITY_VALUES),
    body: z.string().trim().min(2).max(3000),
  }),
  params: z.object({ applicationId: objectId }),
  query: z.object({}),
});

export const updateReviewChecklistSchema = z.object({
  body: z.object({
    requiredDocumentsReviewed: z.boolean(),
    requiredStandardsMet: z.boolean(),
    identityDeclarationsChecked: z.boolean(),
    registrationDataChecked: z.boolean(),
    membershipDatesChecked: z.boolean(),
    certificateDataChecked: z.boolean(),
  }),
  params: z.object({ applicationId: objectId }),
  query: z.object({}),
});

export const paymentWaiverSchema = z
  .object({
    body: z.object({
      waived: z.boolean(),
      reason: z.string().trim().max(1000).default(''),
    }),
    params: z.object({ applicationId: objectId }),
    query: z.object({}),
  })
  .superRefine((value, context) => {
    if (value.body.waived && value.body.reason.length < 10) {
      context.addIssue({
        code: 'custom',
        path: ['body', 'reason'],
        message: 'Explain why payment is being waived.',
      });
    }
  });

export const requestInformationSchema = z.object({
  body: z.object({
    reason: z.string().trim().min(3).max(1000),
    applicantVisibleNote: z.string().trim().min(10).max(3000),
    internalNote: z.string().trim().max(3000).default(''),
    requestedSections: z.array(z.string().trim().min(1).max(120)).min(1).max(50),
  }),
  params: z.object({ applicationId: objectId }),
  query: z.object({}),
});

export const approveApplicationSchema = z.object({
  body: z.object({
    confirmation: z.literal('APPROVE'),
    reason: z.string().trim().max(1000).default(''),
    applicantVisibleNote: z.string().trim().max(3000).default(''),
    internalNote: z.string().trim().max(3000).default(''),
  }),
  params: z.object({ applicationId: objectId }),
  query: z.object({}),
});

export const rejectApplicationSchema = z.object({
  body: z.object({
    confirmation: z.literal('REJECT'),
    reason: z.string().trim().min(3).max(1000),
    applicantVisibleNote: z.string().trim().min(10).max(3000),
    internalNote: z.string().trim().max(3000).default(''),
  }),
  params: z.object({ applicationId: objectId }),
  query: z.object({}),
});

export const suspendApplicationSchema = z.object({
  body: z.object({
    confirmation: z.literal('SUSPEND'),
    reason: z.string().trim().min(3).max(1000),
    applicantVisibleNote: z.string().trim().min(10).max(3000),
    internalNote: z.string().trim().max(3000).default(''),
  }),
  params: z.object({ applicationId: objectId }),
  query: z.object({}),
});

export const auditListSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    action: z.enum([...AUDIT_ACTION_VALUES, '']).optional().default(''),
    outcome: z.enum([...AUDIT_OUTCOME_VALUES, '']).optional().default(''),
    applicationId: optionalObjectId,
    search: z.string().trim().max(160).optional().default(''),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(25),
  }),
});
