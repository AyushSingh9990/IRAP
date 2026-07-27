import { describe, expect, it } from 'vitest';
import {
  approveApplicationSchema,
  bulkAssignReviewerSchema,
  requestInformationSchema,
  updateReviewChecklistSchema,
} from '../src/schemas/review.schema.js';

const objectId = '507f1f77bcf86cd799439011';

describe('administrative review schemas', () => {
  it('requires an explicit approval confirmation', () => {
    const result = approveApplicationSchema.safeParse({
      body: { confirmation: 'approve', reason: '', applicantVisibleNote: '', internalNote: '' },
      params: { applicationId: objectId },
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('requires requested sections and a meaningful applicant note', () => {
    const result = requestInformationSchema.safeParse({
      body: {
        reason: 'Missing qualification details',
        applicantVisibleNote: 'Please provide the awarding institution and qualification date.',
        internalNote: '',
        requestedSections: ['qualifications'],
      },
      params: { applicationId: objectId },
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('limits controlled bulk assignment to fifty applications', () => {
    const result = bulkAssignReviewerSchema.safeParse({
      body: {
        applicationIds: Array.from({ length: 51 }, () => objectId),
        reviewerId: objectId,
        dueAt: null,
      },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('requires the complete approval checklist payload', () => {
    const result = updateReviewChecklistSchema.safeParse({
      body: { requiredDocumentsReviewed: true },
      params: { applicationId: objectId },
      query: {},
    });
    expect(result.success).toBe(false);
  });
});
