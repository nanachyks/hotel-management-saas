import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getDb } from '../db.js';
import { createApp } from './test-app.js';
import { seedTestData } from './setup.js';

const app = createApp();
let token: string;
let guestId: string;
let roomId: string;
let svc1Id: string;
let svc2Id: string;
let rt1Id: string;

beforeEach(async () => {
  const ids = await seedTestData();
  guestId = ids.guestId;
  roomId = ids.room1Id;
  svc1Id = ids.svc1Id;
  svc2Id = ids.svc2Id;
  rt1Id = ids.rt1Id;
  const login = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  token = login.body.token;
});

describe('GET /api/bookings', () => {
  it('should list all bookings (empty)', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });
});

describe('POST /api/bookings', () => {
  it('should create a new booking with invoice', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ guest_id: guestId, room_id: roomId, check_in_date: '2026-08-01', check_out_date: '2026-08-04' });
    expect(res.status).toBe(201);
    expect(res.body.total_amount).toBe(900); // 3 nights * 300 base_price
    expect(res.body).toHaveProperty('guest_name');
    expect(res.body).toHaveProperty('room_number');

    const db = getDb();
    const invoice = await db.queryOne('SELECT * FROM invoices WHERE booking_id = ?', [res.body.id]);
    expect(invoice).not.toBeNull();
    expect(invoice.amount).toBe(900);
  });

  it('should return 400 for missing fields', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('should return 400 for overlapping booking', async () => {
    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ guest_id: guestId, room_id: roomId, check_in_date: '2026-08-01', check_out_date: '2026-08-04' });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ guest_id: guestId, room_id: roomId, check_in_date: '2026-08-02', check_out_date: '2026-08-05' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Room is already booked for these dates');
  });
});

describe('GET /api/bookings/:id', () => {
  it('should return booking details with services and invoice', async () => {
    const create = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ guest_id: guestId, room_id: roomId, check_in_date: '2026-09-01', check_out_date: '2026-09-03' });
    const bookingId = create.body.id;

    const res = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('services');
    expect(res.body).toHaveProperty('invoice');
  });

  it('should return 404 for non-existent booking', async () => {
    const res = await request(app)
      .get('/api/bookings/nonexistent')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/bookings/:id', () => {
  it('should check in a booking and update room status', async () => {
    const create = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ guest_id: guestId, room_id: roomId, check_in_date: '2026-10-01', check_out_date: '2026-10-03' });
    const bookingId = create.body.id;

    const res = await request(app)
      .put(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'checked_in' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('checked_in');

    const db = getDb();
    const room = await db.queryOne('SELECT status FROM rooms WHERE id = ?', [roomId]);
    expect(room.status).toBe('occupied');
  });

  it('should check out a booking and mark invoice as paid', async () => {
    const create = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ guest_id: guestId, room_id: roomId, check_in_date: '2026-11-01', check_out_date: '2026-11-03' });
    const bookingId = create.body.id;

    await request(app)
      .put(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'checked_in' });

    const res = await request(app)
      .put(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'checked_out' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('checked_out');

    const db = getDb();
    const room = await db.queryOne('SELECT status FROM rooms WHERE id = ?', [roomId]);
    expect(room.status).toBe('available');

    const invoice = await db.queryOne('SELECT status FROM invoices WHERE booking_id = ?', [bookingId]);
    expect(invoice.status).toBe('paid');
  });

  it('should cancel a booking and free the room', async () => {
    const create = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ guest_id: guestId, room_id: roomId, check_in_date: '2026-12-01', check_out_date: '2026-12-03' });
    const bookingId = create.body.id;

    const res = await request(app)
      .put(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'cancelled' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');

    const db = getDb();
    const room = await db.queryOne('SELECT status FROM rooms WHERE id = ?', [roomId]);
    expect(room.status).toBe('available');
  });
});

describe('POST /api/bookings/:id/services', () => {
  it('should add a service to a booking and update totals', async () => {
    const create = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ guest_id: guestId, room_id: roomId, check_in_date: '2026-07-01', check_out_date: '2026-07-03' });
    const bookingId = create.body.id;

    const res = await request(app)
      .post(`/api/bookings/${bookingId}/services`)
      .set('Authorization', `Bearer ${token}`)
      .send({ service_id: svc1Id, quantity: 2 });
    expect(res.status).toBe(201);
    expect(res.body.service_name).toBe('Breakfast');

    const db = getDb();
    const booking = await db.queryOne('SELECT total_amount FROM bookings WHERE id = ?', [bookingId]);
    expect(booking.total_amount).toBe(700); // 2 nights * 300 + 2 * 50
  });

  it('should return 400 without service_id', async () => {
    const create = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ guest_id: guestId, room_id: roomId, check_in_date: '2026-07-01', check_out_date: '2026-07-03' });
    const bookingId = create.body.id;

    const res = await request(app)
      .post(`/api/bookings/${bookingId}/services`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/bookings/:id/services/:serviceId', () => {
  it('should remove a service from a booking and recalculate totals', async () => {
    const create = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ guest_id: guestId, room_id: roomId, check_in_date: '2026-07-01', check_out_date: '2026-07-05' });
    const bookingId = create.body.id;

    const add = await request(app)
      .post(`/api/bookings/${bookingId}/services`)
      .set('Authorization', `Bearer ${token}`)
      .send({ service_id: svc1Id, quantity: 1 });

    const res = await request(app)
      .delete(`/api/bookings/${bookingId}/services/${add.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const db = getDb();
    const booking = await db.queryOne('SELECT total_amount FROM bookings WHERE id = ?', [bookingId]);
    expect(booking.total_amount).toBe(1200); // 4 nights * 300, service removed
  });
});
