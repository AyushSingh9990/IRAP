import { describe, expect, it } from 'vitest';
import { APPLICATION_STEP_DEFINITIONS } from '../src/schemas/application.schema.js';

describe('application step schemas', () => {
  it('defines four controlled steps for every application type', () => {
    expect(APPLICATION_STEP_DEFINITIONS.member).toHaveLength(4);
    expect(APPLICATION_STEP_DEFINITIONS.training_provider).toHaveLength(4);
    expect(APPLICATION_STEP_DEFINITIONS.organization).toHaveLength(4);
  });

  it('rejects an incomplete professional member declaration step', () => {
    const declarations = APPLICATION_STEP_DEFINITIONS.member.find(
      (step) => step.key === 'declarations',
    );
    const result = declarations.schema.safeParse({
      identityDeclaration: false,
      ethicsAgreement: false,
      dataConsent: false,
      directoryConsent: false,
    });
    expect(result.success).toBe(false);
  });

  it('accepts a complete organization policy step', () => {
    const policies = APPLICATION_STEP_DEFINITIONS.organization.find(
      (step) => step.key === 'policies',
    );
    const result = policies.schema.safeParse({
      staffCodeOfConduct: 'A documented staff code of conduct that applies to every authorized staff member.',
      qualityAssurancePolicy: 'A documented quality assurance process with reviews and corrective actions.',
      complaintsPolicy: 'A documented complaints process with response targets and escalation paths.',
      safeguardingPolicy: '',
    });
    expect(result.success).toBe(true);
  });
});
