import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getDb } from '../db.js';
import { createApp } from './test-app.js';
import { seedTestData } from './setup.js';

const app = createApp();
let token: string;
let hotelId: string;

beforeEach(async () => {
  const ids = await seedTestData();
  hotelId = ids.hotelId;
  const login = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  token = login.body.token;
});

describe('Franchise Groups', () => {
  it('GET /api/franchise/groups - should list franchise groups', async () => {
    const res = await request(app)
      .get('/api/franchise/groups')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/franchise/groups - should create a franchise group', async () => {
    const res = await request(app)
      .post('/api/franchise/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Franchise' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
  });

  it('POST /api/franchise/groups - should create with settings', async () => {
    const res = await request(app)
      .post('/api/franchise/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Premium Franchise', settings: { fee: 1000 } });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
  });

  it('PUT /api/franchise/groups/:id - should update a franchise group', async () => {
    const create = await request(app)
      .post('/api/franchise/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Old Name' });
    const id = create.body.id;
    const res = await request(app)
      .put(`/api/franchise/groups/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /api/franchise/groups/:id - should delete a franchise group', async () => {
    const create = await request(app)
      .post('/api/franchise/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test' });
    const id = create.body.id;
    const res = await request(app)
      .delete(`/api/franchise/groups/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/franchise/groups/:id/members - should list members', async () => {
    const create = await request(app)
      .post('/api/franchise/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test' });
    const id = create.body.id;
    const res = await request(app)
      .get(`/api/franchise/groups/${id}/members`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/franchise/groups/:id/members - should add a member', async () => {
    const create = await request(app)
      .post('/api/franchise/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test' });
    const id = create.body.id;
    const res = await request(app)
      .post(`/api/franchise/groups/${id}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ hotel_id: hotelId, role: 'member' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /api/franchise/members/:memberId - should remove a member', async () => {
    const create = await request(app)
      .post('/api/franchise/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test' });
    const id = create.body.id;
    const add = await request(app)
      .post(`/api/franchise/groups/${id}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ hotel_id: hotelId, role: 'member' });
    const members = await request(app)
      .get(`/api/franchise/groups/${id}/members`)
      .set('Authorization', `Bearer ${token}`);
    const memberId = members.body.find((m: any) => m.hotel_id === hotelId)?.id;
    const res = await request(app)
      .delete(`/api/franchise/members/${memberId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
