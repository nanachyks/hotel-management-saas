import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getDb } from '../db.js';
import { createApp } from './test-app.js';
import { seedTestData } from './setup.js';

const app = createApp();
let adminToken: string;
let receptionistToken: string;
let ownerToken: string;
let adminId: string;

beforeEach(async () => {
  const ids = await seedTestData();
  adminId = ids.adminId;
  const loginAdmin = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  adminToken = loginAdmin.body.token;
  const loginReceptionist = await request(app)
    .post('/api/auth/login')
    .send({ username: 'receptionist', password: 'receptionist123' });
  receptionistToken = loginReceptionist.body.token;
  const loginOwner = await request(app)
    .post('/api/auth/login')
    .send({ username: 'owner', password: 'owner123' });
  ownerToken = loginOwner.body.token;
});

describe('GET /api/users', () => {
  it('should list users for admin', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(3);
  });

  it('should list users for owner', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);
  });

  it('should return 403 for receptionist', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${receptionistToken}`);
    expect(res.status).toBe(403);
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/users', () => {
  it('should create a user (admin only)', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'newuser', password: 'pass1234', name: 'New User', email: 'new@test.com', role: 'receptionist' });
    expect(res.status).toBe(201);
    expect(res.body.username).toBe('newuser');
  });

  it('should return 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'newuser' });
    expect(res.status).toBe(400);
  });

  it('should return 409 for duplicate username', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'admin', password: 'password1', name: 'Dup', email: 'dup@test.com' });
    expect(res.status).toBe(409);
  });
});

describe('PUT /api/users/:id', () => {
  it('should update a user', async () => {
    const db = getDb();
    const user = await db.queryOne("SELECT id FROM users WHERE username = 'receptionist'");
    const res = await request(app)
      .put(`/api/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Receptionist' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Receptionist');
  });

  it('should update a user with password change', async () => {
    const db = getDb();
    const user = await db.queryOne("SELECT id FROM users WHERE username = 'receptionist'");
    const res = await request(app)
      .put(`/api/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: 'newpass123' });
    expect(res.status).toBe(200);
  });

  it('should return 409 for duplicate username', async () => {
    const db = getDb();
    const user = await db.queryOne("SELECT id FROM users WHERE username = 'receptionist'");
    const res = await request(app)
      .put(`/api/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'admin' });
    expect(res.status).toBe(409);
  });
});

describe('DELETE /api/users/:id', () => {
  it('should delete a user', async () => {
    const db = getDb();
    const user = await db.queryOne("SELECT id FROM users WHERE username = 'receptionist'");
    const res = await request(app)
      .delete(`/api/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('should prevent self-deletion', async () => {
    const res = await request(app)
      .delete(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Cannot delete your own account');
  });

  it('should return 404 for non-existent user', async () => {
    const res = await request(app)
      .delete('/api/users/nonexistent')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
