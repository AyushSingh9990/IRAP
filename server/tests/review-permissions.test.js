import { describe, expect, it } from 'vitest';
import { PERMISSIONS, ROLE_PERMISSIONS } from '../src/constants/permissions.js';
import { ROLES } from '../src/constants/roles.js';

describe('administrative review permissions', () => {
  it('allows reviewers to review and decide without global assignment management', () => {
    const permissions = ROLE_PERMISSIONS[ROLES.REVIEWER];
    expect(permissions).toContain(PERMISSIONS.APPLICATION_REVIEW);
    expect(permissions).toContain(PERMISSIONS.APPLICATION_DECIDE);
    expect(permissions).toContain(PERMISSIONS.DOCUMENT_REVIEW);
    expect(permissions).not.toContain(PERMISSIONS.APPLICATION_ASSIGN);
    expect(permissions).not.toContain(PERMISSIONS.AUDIT_READ);
  });

  it('grants the complete review and audit permission set to super administrators', () => {
    const permissions = ROLE_PERMISSIONS[ROLES.SUPER_ADMIN];
    expect(permissions).toContain(PERMISSIONS.APPLICATION_REVIEW);
    expect(permissions).toContain(PERMISSIONS.APPLICATION_ASSIGN);
    expect(permissions).toContain(PERMISSIONS.APPLICATION_DECIDE);
    expect(permissions).toContain(PERMISSIONS.AUDIT_READ);
  });
});
