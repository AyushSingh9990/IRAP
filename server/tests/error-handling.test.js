import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app.js';

describe('standardized error handling', () => {
  it('returns request identifiers on errors without exposing stack traces', async () => {
    const response = await request(app).get('/api/v1/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.requestId).toBeTruthy();
    expect(response.body.stack).toBeUndefined();
  });

  it('replaces unsafe caller request identifiers with a generated identifier', async () => {
    const response = await request(app)
      .get('/api/v1/does-not-exist')
      .set('X-Request-Id', 'unsafe request identifier');

    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(response.headers['x-request-id']).not.toBe('unsafe request identifier');
  });

  it('returns a generic malformed JSON message', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:5173')
      .set('Content-Type', 'application/json')
      .send('{not-valid-json');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('The JSON request body is malformed.');
  });

  it('does not accept state-changing requests from an unapproved origin', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://attacker.invalid')
      .send({ email: 'person@example.com', password: 'Password!12345' });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('The request origin is not allowed.');
  });
});
