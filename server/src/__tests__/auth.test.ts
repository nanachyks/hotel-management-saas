import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './test-app.js';
import { seedTestData } from './setup.js';

const app = createApp();

beforeEach(async () => {
  await seedTestData();
});

describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ username: 'admin', role: 'admin' });
  });

  it('should return 400 for missing credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Username and password are required');
  });

  it('should return 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('should return 401 for non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'anything' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });
});

describe('POST /api/auth/register', () => {
  it('should register a new user and send verification email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'newuser', password: 'pass1234', name: 'New User', email: 'new@test.com' });
    expect(res.status).toBe(201);
    expect(res.body.message).toContain('check your email');
  });

  it('should return 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'newuser' });
    expect(res.status).toBe(400);
  });

  it('should return 409 for duplicate username', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'another', password: 'pass1234', name: 'Another', email: 'a@test.com' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'another', password: 'pass4567', name: 'Dup', email: 'b@test.com' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Username already taken');
  });

  it('should return 409 for duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'user1', password: 'pass1234', name: 'User1', email: 'dup@test.com' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'user2', password: 'pass4567', name: 'User2', email: 'dup@test.com' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already registered');
  });
});

describe('GET /api/auth/me', () => {
  it('should return current user with valid token', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    const token = login.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ username: 'admin', role: 'admin' });
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('should return 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalidtoken');
    expect(res.status).toBe(401);
  });
});
