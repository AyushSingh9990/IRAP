import { describe, expect, it } from 'vitest';
import { getEffectivePermissions, PERMISSIONS } from '../src/constants/permissions.js';
import { ROLES } from '../src/constants/roles.js';
import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  twoFactorSchema,
} from '../src/schemas/auth.schema.js';

describe('authentication foundation', () => {
  it('grants applicant permissions without granting an approved professional role', () => {
    const permissions = getEffectivePermissions([ROLES.APPLICANT]);

    expect(permissions).toContain(PERMISSIONS.APPLICATION_CREATE_SELF);
    expect(permissions).not.toContain(PERMISSIONS.APPLICATION_REVIEW);
  });

  it('accepts a production-strength registration payload', () => {
    const result = registerSchema.safeParse({
      body: {
        firstName: 'Ayush',
        lastName: 'Kumar',
        email: 'ayush@example.com',
        password: 'SecurePassword!123',
        journey: 'member',
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects weak passwords', () => {
    const result = resetPasswordSchema.safeParse({
      body: { token: 'a'.repeat(64), password: 'password123' },
    });

    expect(result.success).toBe(false);
  });

  it('requires a six-digit two-factor code', () => {
    const valid = twoFactorSchema.safeParse({
      body: { challenge: 'a'.repeat(64), code: '123456' },
    });
    const invalid = twoFactorSchema.safeParse({
      body: { challenge: 'a'.repeat(64), code: '12345' },
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });

  it('normalizes login email addresses', () => {
    const result = loginSchema.parse({
      body: { email: '  USER@EXAMPLE.COM ', password: 'not-validated-here' },
    });

    expect(result.body.email).toBe('user@example.com');
  });
});
