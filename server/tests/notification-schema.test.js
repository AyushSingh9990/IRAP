import { describe, expect, it } from 'vitest';
import {
  accountSettingsSchema,
  notificationListSchema,
  notificationPreferenceSchema,
} from '../src/schemas/dashboard.schema.js';

describe('dashboard and notification schemas', () => {
  it('accepts safe account settings', () => {
    const result = accountSettingsSchema.safeParse({
      body: {
        displayName: 'Ayush Singh',
        telephone: '+91 9999999999',
        preferredLanguage: 'en',
        timeZone: 'Asia/Kolkata',
      },
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects oversized notification pages', () => {
    const result = notificationListSchema.safeParse({
      body: {},
      params: {},
      query: { status: 'all', page: '1', limit: '100' },
    });
    expect(result.success).toBe(false);
  });

  it('requires every notification preference flag', () => {
    const result = notificationPreferenceSchema.safeParse({
      body: { inAppEnabled: true },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });
});
