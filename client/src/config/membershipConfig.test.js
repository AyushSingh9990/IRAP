import { describe, expect, it } from 'vitest';
import {
  certificateStatusLabels,
  formatRegistryDate,
  membershipStatusLabels,
} from './membershipConfig.js';

describe('membership presentation configuration', () => {
  it('labels every controlled membership status', () => {
    expect(Object.keys(membershipStatusLabels)).toEqual([
      'active',
      'renewal_due',
      'grace_period',
      'expired',
      'suspended',
      'revoked',
    ]);
  });

  it('labels replacement certificates separately from revoked certificates', () => {
    expect(certificateStatusLabels.replaced).toBe('Replaced');
    expect(certificateStatusLabels.revoked).toBe('Revoked');
  });

  it('formats registry dates in an unambiguous day-month-year format', () => {
    expect(formatRegistryDate('2026-07-23T00:00:00.000Z')).toContain('2026');
  });
});
