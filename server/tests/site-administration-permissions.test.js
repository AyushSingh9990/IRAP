import { describe, expect, it } from 'vitest';
import { PERMISSIONS, ROLE_PERMISSIONS } from '../src/constants/permissions.js';
import { ROLES } from '../src/constants/roles.js';

describe('administrator permissions', () => {
  it('gives super administrators every declared permission', () => {
    expect(new Set(ROLE_PERMISSIONS[ROLES.SUPER_ADMIN])).toEqual(
      new Set(Object.values(PERMISSIONS)),
    );
  });

  it('keeps support access separate from user and role administration', () => {
    const permissions = ROLE_PERMISSIONS[ROLES.SUPPORT_AGENT];
    expect(permissions).toContain(PERMISSIONS.SUPPORT_MANAGE);
    expect(permissions).not.toContain(PERMISSIONS.USER_MANAGE);
    expect(permissions).not.toContain(PERMISSIONS.ROLE_MANAGE);
  });

  it('allows content managers to manage content and templates without user administration', () => {
    const permissions = ROLE_PERMISSIONS[ROLES.CONTENT_MANAGER];
    expect(permissions).toContain(PERMISSIONS.CONTENT_MANAGE);
    expect(permissions).toContain(PERMISSIONS.TEMPLATE_MANAGE);
    expect(permissions).not.toContain(PERMISSIONS.USER_MANAGE);
  });
});
