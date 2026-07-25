import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './test-app.js';
import { seedTestData } from './setup.js';

const app = createApp();
let token: string;

beforeEach(async () => {
  const ids = await seedTestData();
  const login = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  token = login.body.token;
});

describe('API Keys', () => {
  it('GET /api/api-keys - should list API keys', async () => {
    const res = await request(app)
      .get('/api/api-keys')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/api-keys - should create an API key', async () => {
    const res = await request(app)
      .post('/api/api-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Key' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('key');
    expect(res.body).toHaveProperty('secret');
    expect(res.body.name).toBe('Test Key');
  });

  it('POST /api/api-keys - should create with custom permissions', async () => {
    const res = await request(app)
      .post('/api/api-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Read Only', permissions: ['read'], rate_limit: 50 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('key');
  });

  it('PUT /api/api-keys/:id - should update an API key', async () => {
    const create = await request(app)
      .post('/api/api-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Old Name' });
    const id = create.body.id;
    const res = await request(app)
      .put(`/api/api-keys/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Key', enabled: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /api/api-keys/:id - should delete an API key', async () => {
    const create = await request(app)
      .post('/api/api-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Temp Key' });
    const id = create.body.id;
    const res = await request(app)
      .delete(`/api/api-keys/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/api-keys/:id/regenerate - should regenerate secret', async () => {
    const create = await request(app)
      .post('/api/api-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Key' });
    const id = create.body.id;
    const res = await request(app)
      .post(`/api/api-keys/${id}/regenerate`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('secret');
  });
});
