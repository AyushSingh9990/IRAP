import { describe, expect, it, vi } from 'vitest';
import { authorizePermissions, authorizeRoles } from '../src/middlewares/authorize.js';

function execute(middleware, auth) {
  const next = vi.fn();
  middleware({ auth }, {}, next);
  return next;
}

describe('authorization middleware', () => {
  it('allows an assigned role', () => {
    const next = execute(authorizeRoles('reviewer'), {
      roles: ['applicant', 'reviewer'],
      permissions: [],
    });

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a missing permission', () => {
    const next = execute(authorizePermissions('application:review'), {
      roles: ['applicant'],
      permissions: ['application:read:self'],
    });

    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });
});
