import { describe, expect, it, vi } from 'vitest';
import {
  requireAuthenticationService,
  requireDatabase,
} from '../src/middlewares/requireDatabase.js';

function run(middleware) {
  const next = vi.fn();
  middleware({}, {}, next);
  return next;
}

describe('database availability guards', () => {
  it('returns a service-unavailable error while MongoDB is disconnected', () => {
    const next = run(requireDatabase);
    const error = next.mock.calls[0][0];

    expect(error.statusCode).toBe(503);
    expect(error.message).toBe('The database service is temporarily unavailable.');
  });

  it('keeps authentication disabled explicitly in the isolated test environment', () => {
    const next = run(requireAuthenticationService);
    const error = next.mock.calls[0][0];

    expect(error.statusCode).toBe(503);
    expect(error.message).toContain('Authentication is not configured');
  });
});
