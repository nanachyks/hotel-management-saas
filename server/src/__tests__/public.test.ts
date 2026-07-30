import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { createApp } from './test-app.js';
import { seedTestData } from './setup.js';
import { getDb } from '../db.js';
import { expireStalePendingBookings } from '../jobs/expirePendingBookings.js';

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
    expect(booking.pending_expires_at).not.toBeNull();
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

  it('rejects a second booking attempt for the same room before any payment happens', async () => {
    // Since pending bookings now hold the room too, the second guest is turned away here —
    // at booking time, before ever reaching Paystack — instead of both paying and only one
    // winning the room later.
    mockPaystackInit('ref_hold_a');
    const createA = await createBooking({
      check_in_date: '2026-12-01',
      check_out_date: '2026-12-03',
      guest: { first_name: 'Hold', last_name: 'A', email: 'holda@guest.com', phone: '+1-555-5555' },
    });
    expect(createA.status).toBe(201);

    mockPaystackInit('ref_hold_b');
    const createB = await createBooking({
      check_in_date: '2026-12-01',
      check_out_date: '2026-12-03',
      guest: { first_name: 'Hold', last_name: 'B', email: 'holdb@guest.com', phone: '+1-555-6666' },
    });
    expect(createB.status).toBe(400);
    expect(createB.body.error).toMatch(/no rooms/i);
  });

  it('frees the room again once a stale pending booking expires', async () => {
    mockPaystackInit('ref_expire_a');
    const createA = await createBooking({
      check_in_date: '2026-12-10',
      check_out_date: '2026-12-12',
      guest: { first_name: 'Expire', last_name: 'A', email: 'expirea@guest.com', phone: '+1-555-7777' },
    });
    expect(createA.status).toBe(201);

    const db = getDb();
    await db.execute("UPDATE bookings SET pending_expires_at = NOW() - INTERVAL '1 minute' WHERE id = ?", [createA.body.booking_id]);

    const expiredCount = await expireStalePendingBookings();
    expect(expiredCount).toBeGreaterThanOrEqual(1);

    const bookingA = await db.queryOne('SELECT * FROM bookings WHERE id = ?', [createA.body.booking_id]);
    expect(bookingA.status).toBe('cancelled');
    const paymentA = await db.queryOne('SELECT * FROM booking_payments WHERE booking_id = ?', [createA.body.booking_id]);
    expect(paymentA.status).toBe('failed');

    mockPaystackInit('ref_expire_b');
    const createB = await createBooking({
      check_in_date: '2026-12-10',
      check_out_date: '2026-12-12',
      guest: { first_name: 'Expire', last_name: 'B', email: 'expireb@guest.com', phone: '+1-555-8888' },
    });
    expect(createB.status).toBe(201);
  });

  it('records the payment on the invoice even when the room could not be re-confirmed', async () => {
    // Pending bookings holding the room (above) means two *public* bookings can no longer
    // collide this way. The remaining edge case is a very late webhook: the hold already
    // expired and was swept, and the now-free room was resold and confirmed to someone else,
    // before Paystack's charge.success event for the original guest finally arrives.
    mockPaystackInit('ref_conflict_1');
    const create = await createBooking({
      check_in_date: '2026-11-01',
      check_out_date: '2026-11-03',
      guest: { first_name: 'C', last_name: 'Three', email: 'c@guest.com', phone: '+1-555-4444' },
    });
    expect(create.status).toBe(201);
    const bookingId = create.body.booking_id;

    const db = getDb();
    // The hold expired and was swept, freeing the room...
    await db.execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [bookingId]);
    // ...which was then booked and confirmed by someone else.
    await db.execute(
      'INSERT INTO bookings (id, hotel_id, guest_id, room_id, check_in_date, check_out_date, total_amount, source, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid(), ids.hotelId, ids.guestId, ids.room1Id, '2026-11-01', '2026-11-03', 300, 'walk_in', 'confirmed']
    );

    // The original guest's payment webhook finally arrives.
    const { body, signature } = signedWebhookBody('ref_conflict_1', ids.hotelId, bookingId);
    const webhookRes = await request(app)
      .post('/api/subscriptions/paystack-webhook')
      .set('Content-Type', 'application/json')
      .set('x-paystack-signature', signature)
      .send(body);
    expect(webhookRes.status).toBe(200);

    const booking = await db.queryOne('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    expect(booking.status).toBe('cancelled'); // could not be re-confirmed — the room was gone

    const invoice = await db.queryOne('SELECT * FROM invoices WHERE booking_id = ?', [bookingId]);
    expect(invoice.status).toBe('paid');
    expect(invoice.paid_amount).toBe(invoice.amount);

    const payment = await db.queryOne('SELECT * FROM payments WHERE invoice_id = ?', [invoice.id]);
    expect(payment.method).toBe('online');

    const bookingPayment = await db.queryOne('SELECT * FROM booking_payments WHERE booking_id = ?', [bookingId]);
    expect(bookingPayment.status).toBe('success');
  });
});
