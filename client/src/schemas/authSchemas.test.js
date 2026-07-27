import { describe, expect, it } from 'vitest';
import { registrationSchema } from './authSchemas.js';

describe('client authentication schemas', () => {
  it('accepts a matching strong password', () => {
    const result = registrationSchema.safeParse({
      firstName: 'Ayush',
      lastName: 'Kumar',
      email: 'ayush@example.com',
      journey: 'member',
      password: 'SecurePassword!123',
      confirmPassword: 'SecurePassword!123',
    });

    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = registrationSchema.safeParse({
      firstName: 'Ayush',
      lastName: 'Kumar',
      email: 'ayush@example.com',
      journey: 'member',
      password: 'SecurePassword!123',
      confirmPassword: 'DifferentPassword!123',
    });

    expect(result.success).toBe(false);
  });
});
