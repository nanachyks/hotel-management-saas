import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { createApp } from './test-app.js';
import { seedTestData } from './setup.js';
import { getDb } from '../db.js';

const app = createApp();
let token: string;
let apiKey: string;
let apiSecret: string;
let ids: Awaited<ReturnType<typeof seedTestData>>;

beforeEach(async () => {
  ids = await seedTestData();
  const login = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
  token = login.body.token;

  const keyRes = await request(app)
    .post('/api/api-keys')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'WP Plugin', permissions: ['read', 'write'] });
  apiKey = keyRes.body.key;
  apiSecret = keyRes.body.secret;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockPaystackInit(reference: string) {
  vi.spyOn(global, 'fetch').mockResolvedValue({
    json: async () => ({
      status: true,
      message: 'ok',
      data: {
        authorization_url: `https://checkout.paystack.com/${reference}`,
        reference,
        access_code: `access_${reference}`,
      },
    }),
  } as any);
}

function signedWebhookBody(reference: string, hotelId: string, bookingId: string) {
  const body = JSON.stringify({
    event: 'charge.success',
    data: { reference, metadata: { hotel_id: hotelId, booking_id: bookingId, type: 'booking' } },
  });
  const signature = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!).update(body).digest('hex');
  return { body, signature };
}

function createBooking(overrides: Record<string, any> = {}) {
  return request(app)
    .post('/api/public/bookings')
    .set('X-API-Key', apiKey)
    .set('X-API-Secret', apiSecret)
    .send({
      room_type_id: ids.rt1Id,
      check_in_date: '2026-09-01',
      check_out_date: '2026-09-03',
      guest: { first_name: 'Jane', last_name: 'Doe', email: 'jane@guest.com', phone: '+1-555-9999' },
      ...overrides,
    });
}

describe('Public booking payments', () => {
  it('creates a pending booking and starts a Paystack transaction', async () => {
    mockPaystackInit('ref_create_1');
    const res = await createBooking();

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
    expect(res.body.payment.authorization_url).toContain('checkout.paystack.com');

    const db = getDb();
    const booking = await db.queryOne('SELECT * FROM bookings WHERE id = ?', [res.body.booking_id]);
    expect(booking.status).toBe('pending');
    const payment = await db.queryOne('SELECT * FROM booking_payments WHERE booking_id = ?', [res.body.booking_id]);
    expect(payment.status).toBe('pending');
  });

  it('confirms the booking once the Paystack webhook reports charge.success', async () => {
    mockPaystackInit('ref_confirm_1');
    const create = await createBooking({
      check_in_date: '2026-09-05',
      check_out_date: '2026-09-07',
      guest: { first_name: 'John', last_name: 'Smith', email: 'john@guest.com', phone: '+1-555-1111' },
    });
    const bookingId = create.body.booking_id;

    const { body, signature } = signedWebhookBody('ref_confirm_1', ids.hotelId, bookingId);
    const webhookRes = await request(app)
      .post('/api/subscriptions/paystack-webhook')
      .set('Content-Type', 'application/json')
      .set('x-paystack-signature', signature)
      .send(body);
    expect(webhookRes.status).toBe(200);

    const db = getDb();
    const booking = await db.queryOne('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    expect(booking.status).toBe('confirmed');
    const invoice = await db.queryOne('SELECT * FROM invoices WHERE booking_id = ?', [bookingId]);
    expect(invoice.status).toBe('paid');
    const payment = await db.queryOne(`SELECT * FROM payments WHERE invoice_id = ?`, [invoice.id]);
    expect(payment.method).toBe('online');
    const bookingPayment = await db.queryOne('SELECT * FROM booking_payments WHERE booking_id = ?', [bookingId]);
    expect(bookingPayment.status).toBe('success');
  });

  it('leaves the losing booking pending (flagged, not lost) when two paid bookings collide on the same room', async () => {
    // room_types.rt1Id has exactly one seeded room, so both bookings below target it.
    mockPaystackInit('ref_race_a');
    const createA = await createBooking({
      check_in_date: '2026-10-01',
      check_out_date: '2026-10-03',
      guest: { first_name: 'A', last_name: 'One', email: 'a@guest.com', phone: '+1-555-2222' },
    });
    expect(createA.status).toBe(201);

    mockPaystackInit('ref_race_b');
    const createB = await createBooking({
      check_in_date: '2026-10-01',
      check_out_date: '2026-10-03',
      guest: { first_name: 'B', last_name: 'Two', email: 'b@guest.com', phone: '+1-555-3333' },
    });
    expect(createB.status).toBe(201);

    const confirmA = signedWebhookBody('ref_race_a', ids.hotelId, createA.body.booking_id);
    await request(app).post('/api/subscriptions/paystack-webhook')
      .set('Content-Type', 'application/json').set('x-paystack-signature', confirmA.signature).send(confirmA.body);

    const confirmB = signedWebhookBody('ref_race_b', ids.hotelId, createB.body.booking_id);
    const resB = await request(app).post('/api/subscriptions/paystack-webhook')
      .set('Content-Type', 'application/json').set('x-paystack-signature', confirmB.signature).send(confirmB.body);
    // The webhook always 200s (so Paystack doesn't endlessly retry), even though the second
    // booking couldn't be confirmed.
    expect(resB.status).toBe(200);

    const db = getDb();
    const bookingA = await db.queryOne('SELECT * FROM bookings WHERE id = ?', [createA.body.booking_id]);
    const bookingB = await db.queryOne('SELECT * FROM bookings WHERE id = ?', [createB.body.booking_id]);
    expect(bookingA.status).toBe('confirmed');
    expect(bookingB.status).toBe('pending');

    const paymentB = await db.queryOne('SELECT * FROM booking_payments WHERE booking_id = ?', [createB.body.booking_id]);
    expect(paymentB.status).toBe('success');
  });
});
