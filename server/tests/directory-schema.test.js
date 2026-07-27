import { describe, expect, it } from 'vitest';
import { directoryListSchema } from '../src/schemas/directory.schema.js';

describe('directory validation', () => {
  it('accepts a complete distance query', () => {
    const result = directoryListSchema.safeParse({
      params: { directoryType: 'members' },
      query: {
        latitude: '28.6139',
        longitude: '77.2090',
        radiusKm: '25',
        sort: 'distance',
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects an incomplete distance query', () => {
    const result = directoryListSchema.safeParse({
      params: { directoryType: 'members' },
      query: { latitude: '28.6139', sort: 'distance' },
    });

    expect(result.success).toBe(false);
  });
});
