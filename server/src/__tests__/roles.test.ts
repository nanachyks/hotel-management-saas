import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getDb } from '../db.js';
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

describe('Custom Roles', () => {
  it('GET /api/roles - should list roles', async () => {
    const res = await request(app)
      .get('/api/roles')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/roles - should create a role', async () => {
    const res = await request(app)
      .post('/api/roles')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Night Auditor', permissions: ['bookings.view', 'guests.view'] });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
  });

  it('POST /api/roles - should create with empty permissions', async () => {
    const res = await request(app)
      .post('/api/roles')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Limited Access' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
  });

  it('PUT /api/roles/:id - should update a role', async () => {
    const create = await request(app)
      .post('/api/roles')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Old Role' });
    const id = create.body.id;
    const res = await request(app)
      .put(`/api/roles/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Role' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /api/roles/:id - should delete a role', async () => {
    const create = await request(app)
      .post('/api/roles')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Temp Role' });
    const id = create.body.id;
    const res = await request(app)
      .delete(`/api/roles/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/roles/assign - should assign role to user', async () => {
    const db = getDb();
    const users = await db.queryAll('SELECT id FROM users LIMIT 1');
    const role = await request(app)
      .post('/api/roles')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Night Auditor' });
    const res = await request(app)
      .post('/api/roles/assign')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: users[0].id, role_id: role.body.id });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
