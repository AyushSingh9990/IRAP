import { describe, expect, it } from 'vitest';
import { applicationFormDefinitions } from '../config/applicationForms.js';
import { createApplicationStepSchema } from './applicationSchemas.js';

describe('application form schemas', () => {
  it('requires mandatory member identity fields', () => {
    const step = applicationFormDefinitions.member.steps[0];
    const schema = createApplicationStepSchema(step);
    const result = schema.safeParse({
      legalFirstName: '',
      legalMiddleName: '',
      legalLastName: '',
      displayName: '',
      telephone: '',
      dateOfBirth: '',
      country: '',
      region: '',
      city: '',
      postalCode: '',
    });
    expect(result.success).toBe(false);
  });

  it('allows directory consent to be declined while requiring core declarations', () => {
    const step = applicationFormDefinitions.organization.steps.at(-1);
    const schema = createApplicationStepSchema(step);
    const result = schema.safeParse({
      accreditationDeclaration: true,
      dataConsent: true,
      directoryConsent: false,
    });
    expect(result.success).toBe(true);
  });
});
