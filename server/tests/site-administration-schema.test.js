import { describe, expect, it } from 'vitest';
import {
  publicComplaintSchema,
  publicContactSchema,
  updateRoleDefinitionSchema,
  updateUserAdministrationSchema,
  upsertSettingSchema,
} from '../src/schemas/site.schema.js';

const objectId = '507f1f77bcf86cd799439011';

describe('site-administration validation', () => {
  it('accepts a public non-secret contact setting', () => {
    const result = upsertSettingSchema.safeParse({
      body: {
        key: 'contact.email',
        group: 'contact',
        label: 'Public contact email',
        description: 'Address displayed on public contact surfaces.',
        value: 'support@example.test',
        valueType: 'string',
        public: true,
      },
      params: { key: 'contact.email' },
      query: {},
    });

    expect(result.success).toBe(true);
  });

  it('rejects a contact form honeypot value', () => {
    const result = publicContactSchema.safeParse({
      body: {
        name: 'Application User',
        email: 'user@example.test',
        telephone: '',
        subject: 'Account support',
        category: 'technical_support',
        message: 'I need help reviewing an account workflow and its current status.',
        website: 'https://spam.example',
      },
      params: {},
      query: {},
    });

    expect(result.success).toBe(false);
  });

  it('accepts a private complaint with a related reference', () => {
    const result = publicComplaintSchema.safeParse({
      body: {
        name: 'Application User',
        email: 'user@example.test',
        telephone: '',
        subject: 'Formal review request',
        message: 'Please review the handling of the referenced application and provide a tracked response.',
        relatedReference: 'IRAP-APP-REFERENCE',
        website: '',
      },
      params: {},
      query: {},
    });

    expect(result.success).toBe(true);
  });

  it('requires a reason for administrator account changes', () => {
    const result = updateUserAdministrationSchema.safeParse({
      body: {
        accountStatus: 'active',
        roles: ['applicant'],
        additionalPermissions: [],
        twoFactorEnforced: false,
        reason: '',
      },
      params: { userId: objectId },
      query: {},
    });

    expect(result.success).toBe(false);
  });

  it('accepts controlled role permission configuration', () => {
    const result = updateRoleDefinitionSchema.safeParse({
      body: {
        label: 'Support agent',
        description: 'Handles private support and complaint queues.',
        additionalPermissions: ['audit:read'],
        active: true,
      },
      params: { role: 'support_agent' },
      query: {},
    });

    expect(result.success).toBe(true);
  });
});
