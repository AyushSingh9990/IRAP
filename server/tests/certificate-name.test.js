import { describe, expect, it } from 'vitest';
import {
  resolveApprovedCertificateName,
  resolveDirectoryConsent,
} from '../src/services/certificate.service.js';

function application(type, steps) {
  return { type, steps: new Map(Object.entries(steps)) };
}

describe('certificate names', () => {
  it('uses the approved member display name', () => {
    const record = application('member', {
      identity: { data: { displayName: 'Dr Ayush Singh' } },
    });
    expect(resolveApprovedCertificateName(record)).toBe('Dr Ayush Singh');
  });

  it('uses the provider legal business name', () => {
    const record = application('training_provider', {
      business: { data: { legalBusinessName: 'Approved Training Services' } },
    });
    expect(resolveApprovedCertificateName(record)).toBe('Approved Training Services');
  });

  it('uses the organization legal name and keeps directory consent separate', () => {
    const record = application('organization', {
      identity: { data: { legalOrganizationName: 'Approved Professional Organization' } },
      declarations: { data: { directoryConsent: true } },
    });
    expect(resolveApprovedCertificateName(record)).toBe('Approved Professional Organization');
    expect(resolveDirectoryConsent(record)).toBe(true);
  });

  it('refuses issuance when no approved name is available', () => {
    const record = application('member', { identity: { data: {} } });
    expect(() => resolveApprovedCertificateName(record)).toThrow(
      'The approved application does not contain a valid certificate name.',
    );
  });
});
