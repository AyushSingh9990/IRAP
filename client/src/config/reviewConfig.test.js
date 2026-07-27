import { describe, expect, it } from 'vitest';
import {
  applicationTypeLabels,
  auditActionLabels,
  reviewChecklistDefinitions,
} from './reviewConfig.js';

describe('review configuration', () => {
  it('defines all three application types', () => {
    expect(Object.keys(applicationTypeLabels)).toEqual([
      'member',
      'training_provider',
      'organization',
    ]);
  });

  it('defines every manual approval checklist item once', () => {
    const keys = reviewChecklistDefinitions.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual([
      'requiredDocumentsReviewed',
      'requiredStandardsMet',
      'identityDeclarationsChecked',
      'registrationDataChecked',
      'membershipDatesChecked',
      'certificateDataChecked',
    ]);
  });

  it('labels all critical application decisions', () => {
    expect(auditActionLabels['application.approved']).toBe('Application approved');
    expect(auditActionLabels['application.rejected']).toBe('Application rejected');
    expect(auditActionLabels['application.suspended']).toBe('Application suspended');
  });
});
