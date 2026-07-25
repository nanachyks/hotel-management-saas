import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getDb } from '../db.js';
import { createApp } from './test-app.js';
import { seedTestData } from './setup.js';

const app = createApp();
let token: string;

beforeEach(async () => {
  await seedTestData();
  const login = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  token = login.body.token;
});

describe('GET /api/services', () => {
  it('should list all services', async () => {
    const res = await request(app)
      .get('/api/services')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });
});

describe('POST /api/services', () => {
  it('should create a service', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Laundry', price: 25, category: 'laundry' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Laundry');
  });

  it('should return 400 without required fields', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Laundry' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/services/:id', () => {
  it('should update a service', async () => {
    const db = getDb();
    const svc = await db.queryOne('SELECT id FROM services');
    const res = await request(app)
      .put(`/api/services/${svc.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 60 });
    expect(res.status).toBe(200);
    expect(res.body.price).toBe(60);
  });

  it('should return 404 for non-existent service', async () => {
    const res = await request(app)
      .put('/api/services/nonexistent')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/services/:id', () => {
  it('should delete a service', async () => {
    const db = getDb();
    const svc = await db.queryOne('SELECT id FROM services');
    const res = await request(app)
      .delete(`/api/services/${svc.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Service deleted');
  });
});
