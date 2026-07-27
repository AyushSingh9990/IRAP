import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app.js';

describe('API foundation', () => {
  it('returns the versioned API response', async () => {
    const response = await request(app).get('/api/v1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'iRAP API foundation is available.',
      data: { version: 'v1', authenticationEnabled: false },
      meta: {},
    });
  });

  it('reports a healthy foundation mode when MongoDB is not configured', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.database).toBe('not_configured');
    expect(response.body.data.databaseRequired).toBe(false);
    expect(response.body.data.authenticationEnabled).toBe(false);
  });

  it('keeps authentication routes explicit when the service is disabled', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ email: 'person@example.com', password: 'ExamplePassword!123' });

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Authentication is not configured');
  });

  it('rejects unapproved request origins for state-changing requests', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://unapproved.example')
      .send({ email: 'person@example.com', password: 'ExamplePassword!123' });

    expect(response.status).toBe(403);
  });

  it('returns the standardized 404 response', async () => {
    const response = await request(app).get('/api/v1/unknown-route');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('was not found');
  });
});
