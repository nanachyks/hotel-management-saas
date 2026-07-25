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

describe('GET /api/room-types', () => {
  it('should list all room types', async () => {
    const res = await request(app)
      .get('/api/room-types')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });
});

describe('POST /api/room-types', () => {
  it('should create a room type', async () => {
    const res = await request(app)
      .post('/api/room-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Suite', base_price: 1000, capacity: 4 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Suite');
  });

  it('should return 400 without required fields', async () => {
    const res = await request(app)
      .post('/api/room-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Suite' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/room-types/:id', () => {
  it('should update a room type', async () => {
    const db = getDb();
    const types = await db.queryAll('SELECT id FROM room_types');
    const res = await request(app)
      .put(`/api/room-types/${types[0].id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ base_price: 350 });
    expect(res.status).toBe(200);
    expect(res.body.base_price).toBe(350);
  });

  it('should return 404 for non-existent type', async () => {
    const res = await request(app)
      .put('/api/room-types/nonexistent')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/room-types/:id', () => {
  it('should delete a room type with no rooms assigned', async () => {
    const created = await request(app)
      .post('/api/room-types')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Unused Type', base_price: 100 });
    const res = await request(app)
      .delete(`/api/room-types/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('should reject deleting a room type with rooms assigned', async () => {
    const db = getDb();
    const types = await db.queryAll('SELECT id FROM room_types');
    const res = await request(app)
      .delete(`/api/room-types/${types[0].id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});
