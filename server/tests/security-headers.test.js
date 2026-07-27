import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app.js';

describe('HTTP security hardening', () => {
  it('removes framework disclosure and sets defensive headers', async () => {
    const response = await request(app).get('/api/v1');

    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
  });

  it('prevents caching of sensitive and general API responses', async () => {
    const response = await request(app).get('/api/v1');
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('rejects cross-site state-changing requests using Fetch Metadata', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('Sec-Fetch-Site', 'cross-site')
      .send({ email: 'person@example.com', password: 'Password!12345' });

    expect(response.status).toBe(403);
  });

  it('rejects an oversized JSON body', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:5173')
      .set('Content-Type', 'application/json')
      .send({ payload: 'x'.repeat(1_100_000) });

    expect(response.status).toBe(413);
    expect(response.body.success).toBe(false);
  });
});
