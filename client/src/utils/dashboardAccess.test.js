import { describe, expect, it } from 'vitest';
import {
  getAdministrativeDestination,
  getPersonalJourneys,
  getPrimaryWorkspaceDestination,
  hasPersonalJourney,
} from './dashboardAccess.js';

describe('dashboard access helpers', () => {
  it('keeps administrative-only accounts out of applicant workspaces', () => {
    const user = {
      roles: ['super_admin'],
      requestedJourneys: [],
      permissions: ['application:review', 'user:manage'],
    };

    expect(hasPersonalJourney(user)).toBe(false);
    expect(getAdministrativeDestination(user)).toBe('/admin');
    expect(getPrimaryWorkspaceDestination(user)).toBe('/admin');
  });

  it('retains personal journeys for users who also have administrative access', () => {
    const user = {
      roles: ['training_provider', 'reviewer'],
      requestedJourneys: ['training_provider'],
      permissions: ['application:review'],
    };

    expect([...getPersonalJourneys(user)]).toEqual(['training_provider']);
    expect(hasPersonalJourney(user)).toBe(true);
    expect(getPrimaryWorkspaceDestination(user)).toBe('/admin');
  });

  it('sends non-administrative users to the account dashboard', () => {
    const user = {
      roles: ['member'],
      requestedJourneys: ['member'],
      permissions: ['application:read:self'],
    };

    expect(getAdministrativeDestination(user)).toBe('');
    expect(getPrimaryWorkspaceDestination(user)).toBe('/dashboard');
  });
});
