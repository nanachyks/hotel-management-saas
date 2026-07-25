import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getDb } from '../db.js';
import { createApp } from './test-app.js';
import { seedTestData } from './setup.js';
import { v4 as uuid } from 'uuid';

const app = createApp();
let token: string;
let guestId: string;
let roomId: string;

beforeEach(async () => {
  const ids = await seedTestData();
  guestId = ids.guestId;
  roomId = ids.room1Id;
  const login = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  token = login.body.token;
});

function createBooking(): Promise<string> {
  return request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${token}`)
    .send({ guest_id: guestId, room_id: roomId, check_in_date: '2026-08-01', check_out_date: '2026-08-03' })
    .then(r => r.body.id);
}

describe('GET /api/invoices', () => {
  it('should list all invoices', async () => {
    await createBooking();
    const res = await request(app)
      .get('/api/invoices')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toHaveProperty('guest_name');
    expect(res.body[0]).toHaveProperty('room_number');
  });

  it('should filter invoices by status', async () => {
    await createBooking();
    const res = await request(app)
      .get('/api/invoices?status=paid')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });
});

describe('POST /api/invoices/:id/pay', () => {
  it('should mark invoice as paid', async () => {
    const bookingId = await createBooking();
    const db = getDb();
    const invoice = await db.queryOne('SELECT id, amount FROM invoices WHERE booking_id = ?', [bookingId]);

    const res = await request(app)
      .post(`/api/invoices/${invoice.id}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: invoice.amount, method: 'cash' });
    expect(res.status).toBe(201);

    const updated = await db.queryOne('SELECT status, paid_amount FROM invoices WHERE id = ?', [invoice.id]);
    expect(updated.status).toBe('paid');
    expect(updated.paid_amount).toBe(invoice.amount);
  });

  it('should mark invoice as partial with partial payment', async () => {
    const bookingId = await createBooking();
    const db = getDb();
    const invoice = await db.queryOne('SELECT id, amount FROM invoices WHERE booking_id = ?', [bookingId]);

    const res = await request(app)
      .post(`/api/invoices/${invoice.id}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100, method: 'card' });
    expect(res.status).toBe(201);

    const updated = await db.queryOne('SELECT status, paid_amount FROM invoices WHERE id = ?', [invoice.id]);
    expect(updated.status).toBe('partial');
    expect(updated.paid_amount).toBe(100);
  });

  it('should return 404 for non-existent invoice', async () => {
    const res = await request(app)
      .post('/api/invoices/nonexistent/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100, method: 'cash' });
    expect(res.status).toBe(404);
  });

  it('should return 400 without method', async () => {
    const bookingId = await createBooking();
    const db = getDb();
    const invoice = await db.queryOne('SELECT id FROM invoices WHERE booking_id = ?', [bookingId]);

    const res = await request(app)
      .post(`/api/invoices/${invoice.id}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100 });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/invoices/:id', () => {
  it('should update invoice fields', async () => {
    const bookingId = await createBooking();
    const db = getDb();
    const invoice = await db.queryOne('SELECT id FROM invoices WHERE booking_id = ?', [bookingId]);

    const res = await request(app)
      .put(`/api/invoices/${invoice.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'cancelled' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });
});
