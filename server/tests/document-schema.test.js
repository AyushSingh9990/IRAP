import { describe, expect, it } from 'vitest';
import {
  reviewDocumentSchema,
  uploadDocumentSchema,
} from '../src/schemas/document.schema.js';

describe('document schemas', () => {
  it('accepts supported upload metadata', () => {
    const result = uploadDocumentSchema.safeParse({
      body: {
        applicationId: '507f1f77bcf86cd799439011',
        category: 'qualification_certificate',
        title: 'Bachelor qualification',
        expiryDate: '',
      },
      params: {},
      query: {},
    });

    expect(result.success).toBe(true);
  });

  it('requires an applicant-visible note for replacement requests', () => {
    const result = reviewDocumentSchema.safeParse({
      body: {
        action: 'request_replacement',
        applicantVisibleNote: '',
        internalNote: '',
        reason: '',
      },
      params: { documentId: '507f1f77bcf86cd799439011' },
      query: {},
    });

    expect(result.success).toBe(false);
  });
});
