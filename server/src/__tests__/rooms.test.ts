import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getDb } from '../db.js';
import { createApp } from './test-app.js';
import { seedTestData } from './setup.js';

const app = createApp();
let token: string;
let roomIds: string[];

beforeEach(async () => {
  const ids = seedTestData();
  const login = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  token = login.body.token;
  const db = getDb();
  const rooms = db.queryAll('SELECT id FROM rooms ORDER BY room_number');
  roomIds = rooms.map((r: any) => r.id);
});

describe('GET /api/rooms', () => {
  it('should list all rooms', async () => {
    const res = await request(app)
      .get('/api/rooms')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.body[0]).toHaveProperty('room_number');
    expect(res.body[0]).toHaveProperty('room_type_name');
  });

  it('should filter by status', async () => {
    const res = await request(app)
      .get('/api/rooms?status=maintenance')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });
});

describe('GET /api/rooms/:id', () => {
  it('should return a room by id', async () => {
    const res = await request(app)
      .get(`/api/rooms/${roomIds[0]}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.room_number).toBe('101');
  });

  it('should return 404 for non-existent room', async () => {
    const res = await request(app)
      .get('/api/rooms/nonexistent-id')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/rooms', () => {
  it('should create a new room', async () => {
    const db = getDb();
    const types = db.queryAll('SELECT id FROM room_types');
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ room_number: '201', room_type_id: types[0].id, floor: 2 });
    expect(res.status).toBe(201);
    expect(res.body.room_number).toBe('201');
  });

  it('should return 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/rooms/:id', () => {
  it('should update a room', async () => {
    const res = await request(app)
      .put(`/api/rooms/${roomIds[0]}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'maintenance' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('maintenance');
  });

  it('should return 404 for non-existent room', async () => {
    const res = await request(app)
      .put('/api/rooms/nonexistent')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'maintenance' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/rooms/:id', () => {
  it('should delete a room', async () => {
    const res = await request(app)
      .delete(`/api/rooms/${roomIds[0]}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Room deleted');
  });

  it('should return 404 for non-existent room', async () => {
    const res = await request(app)
      .delete('/api/rooms/nonexistent')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/rooms/availability', () => {
  it('should return availability for date range', async () => {
    const res = await request(app)
      .get('/api/rooms/availability?from=2026-07-01&to=2026-07-03')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('dates');
    expect(res.body).toHaveProperty('rooms');
    expect(res.body.dates.length).toBe(3);
  });

  it('should return 400 without date params', async () => {
    const res = await request(app)
      .get('/api/rooms/availability')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/rooms/check-availability', () => {
  it('should return available for free room', async () => {
    const res = await request(app)
      .get(`/api/rooms/check-availability?room_id=${roomIds[0]}&check_in=2026-08-01&check_out=2026-08-03`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
  });

  it('should return 400 without required params', async () => {
    const res = await request(app)
      .get('/api/rooms/check-availability')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});
