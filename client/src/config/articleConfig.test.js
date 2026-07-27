import { describe, expect, it } from 'vitest';
import {
  articleAuthorTypeLabels,
  articleStatusLabels,
  articleStatusTones,
  editableArticleStatuses,
  formatArticleDate,
} from './articleConfig.js';

describe('article configuration', () => {
  it('defines labels and tones for every article workflow status', () => {
    expect(Object.keys(articleStatusLabels)).toEqual(
      expect.arrayContaining([
        'draft',
        'submitted',
        'under_review',
        'changes_requested',
        'approved',
        'published',
        'rejected',
        'archived',
      ]),
    );
    expect(Object.keys(articleStatusTones)).toEqual(
      expect.arrayContaining(Object.keys(articleStatusLabels)),
    );
  });

  it('only permits author editing in controlled statuses', () => {
    expect(editableArticleStatuses).toEqual(['draft', 'changes_requested']);
  });

  it('defines both approved article author types', () => {
    expect(articleAuthorTypeLabels.training_provider).toBeTruthy();
    expect(articleAuthorTypeLabels.organization).toBeTruthy();
  });

  it('returns an honest fallback for an absent date', () => {
    expect(formatArticleDate('')).toBe('Not available');
  });
});
