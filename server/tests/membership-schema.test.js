import { describe, expect, it } from 'vitest';
import {
  membershipAdminActionSchema,
  membershipPolicySchema,
  publicVerificationSchema,
} from '../src/schemas/membership.schema.js';

const objectId = '507f1f77bcf86cd799439011';

function validPolicyBody() {
  return {
    validityMonths: {
      member: 12,
      trainingProvider: 24,
      organization: 24,
    },
    renewalWindowDays: 90,
    gracePeriodDays: 30,
    reminderDays: [90, 30, 7, 0],
    registrationPrefixes: {
      member: 'MEM',
      trainingProvider: 'TPR',
      organization: 'ORG',
    },
    certificatePrefix: 'CERT',
    authorizedSignatory: {
      name: 'Registry Signatory',
      title: 'Authorized Signatory',
    },
  };
}

describe('membership schemas', () => {
  it('accepts a complete administrator-controlled membership policy', () => {
    const result = membershipPolicySchema.safeParse({
      body: validPolicyBody(),
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects duplicate reminder offsets', () => {
    const body = validPolicyBody();
    body.reminderDays = [30, 30];
    const result = membershipPolicySchema.safeParse({ body, params: {}, query: {} });
    expect(result.success).toBe(false);
  });

  it('requires the exact controlled status confirmation', () => {
    const result = membershipAdminActionSchema.safeParse({
      body: {
        action: 'revoke',
        confirmation: 'revoke',
        reason: 'The registry record must be revoked following an authorized decision.',
      },
      params: { membershipId: objectId },
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('accepts a public verification identifier', () => {
    const result = publicVerificationSchema.safeParse({
      body: undefined,
      params: { identifier: 'IRAP-CERT-2026-000001' },
      query: {},
    });
    expect(result.success).toBe(true);
  });
});
