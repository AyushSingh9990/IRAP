import { describe, expect, it } from 'vitest';
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
} from '../src/constants/permissions.js';
import { ROLES } from '../src/constants/roles.js';

describe('course permissions', () => {
  it('allows accredited training providers to manage their own courses', () => {
    const permissions = ROLE_PERMISSIONS[ROLES.TRAINING_PROVIDER];

    expect(permissions).toContain(PERMISSIONS.COURSE_CREATE_SELF);
    expect(permissions).toContain(PERMISSIONS.COURSE_READ_SELF);
    expect(permissions).toContain(PERMISSIONS.COURSE_UPDATE_SELF);
  });

  it('allows reviewers to review and decide without policy management', () => {
    const permissions = ROLE_PERMISSIONS[ROLES.REVIEWER];

    expect(permissions).toContain(PERMISSIONS.COURSE_REVIEW);
    expect(permissions).toContain(PERMISSIONS.COURSE_DECIDE);
    expect(permissions).not.toContain(PERMISSIONS.COURSE_MANAGE_POLICY);
  });

  it('grants complete course administration to super administrators', () => {
    const permissions = ROLE_PERMISSIONS[ROLES.SUPER_ADMIN];

    expect(permissions).toContain(PERMISSIONS.COURSE_ASSIGN);
    expect(permissions).toContain(PERMISSIONS.COURSE_MANAGE_POLICY);
  });
});
