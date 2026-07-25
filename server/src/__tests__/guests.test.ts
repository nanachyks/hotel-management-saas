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

describe('GET /api/guests', () => {
  it('should list all guests', async () => {
    const res = await request(app)
      .get('/api/guests')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].email).toBe('john@test.com');
  });

  it('should search guests by name', async () => {
    const res = await request(app)
      .get('/api/guests?search=john')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it('should return empty for non-matching search', async () => {
    const res = await request(app)
      .get('/api/guests?search=zzzzz')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });
});

describe('POST /api/guests', () => {
  it('should create a guest', async () => {
    const res = await request(app)
      .post('/api/guests')
      .set('Authorization', `Bearer ${token}`)
      .send({ first_name: 'Jane', last_name: 'Smith', email: 'jane@test.com', phone: '+1-555-0102' });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('jane@test.com');
  });

  it('should return 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/guests')
      .set('Authorization', `Bearer ${token}`)
      .send({ first_name: 'Jane' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/guests/:id', () => {
  it('should return a guest by id', async () => {
    const db = getDb();
    const guest = await db.queryOne('SELECT id FROM guests');
    const res = await request(app)
      .get(`/api/guests/${guest.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('john@test.com');
  });

  it('should return 404 for non-existent guest', async () => {
    const res = await request(app)
      .get('/api/guests/nonexistent')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/guests/:id', () => {
  it('should update a guest', async () => {
    const db = getDb();
    const guest = await db.queryOne('SELECT id FROM guests');
    const res = await request(app)
      .put(`/api/guests/${guest.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+1-555-0999' });
    expect(res.status).toBe(200);
    expect(res.body.phone).toBe('+1-555-0999');
  });
});

describe('DELETE /api/guests/:id', () => {
  it('should delete a guest', async () => {
    const db = getDb();
    const guest = await db.queryOne('SELECT id FROM guests');
    const res = await request(app)
      .delete(`/api/guests/${guest.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Guest deleted');
  });
});
