import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { getDb } from '../db.js';
import { sendBookingConfirmation } from '../services/email.js';
import { validate } from '../middleware/validate.js';
import { ApiKeyRequest, requireApiPermission } from '../middleware/apiKeyAuth.js';
import { createNotification } from './notifications.js';
import { initializeTransaction, isConfigured } from '../services/paystack.js';

export const publicRouter = Router();
const db = getDb();

const EXCLUSION_VIOLATION = '23P01';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a date in YYYY-MM-DD format');

// List room types available for public booking display
publicRouter.get('/room-types', requireApiPermission('read'), async (req: ApiKeyRequest, res: Response) => {
  const roomTypes = await db.queryAll(
    'SELECT id, name, description, base_price, capacity FROM room_types WHERE hotel_id = ? ORDER BY base_price ASC',
    [req.apiKeyAuth!.hotelId]
  );
  res.json(roomTypes);
});

const availabilitySchema = z.object({
  check_in: dateString,
  check_out: dateString,
  room_type_id: z.string().optional(),
});

// Rooms free for a given date range, optionally scoped to one room type
publicRouter.get('/availability', requireApiPermission('read'), async (req: ApiKeyRequest, res: Response) => {
  const parsed = availabilitySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'check_in and check_out (YYYY-MM-DD) are required' });
  }
  const { check_in, check_out, room_type_id } = parsed.data;
  if (check_out <= check_in) {
    return res.status(400).json({ error: 'check_out must be after check_in' });
  }

  let query = `
    SELECT r.id, r.room_number, rt.id as room_type_id, rt.name as room_type_name, rt.base_price, rt.capacity
    FROM rooms r
    JOIN room_types rt ON r.room_type_id = rt.id
    WHERE r.hotel_id = ? AND r.status != 'maintenance'
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.room_id = r.id AND b.status IN ('confirmed', 'checked_in')
      AND b.check_in_date < ? AND b.check_out_date > ?
    )
  `;
  const params: string[] = [req.apiKeyAuth!.hotelId, check_out, check_in];
  if (room_type_id) {
    query += ' AND rt.id = ?';
    params.push(room_type_id);
  }
  query += ' ORDER BY rt.base_price ASC';

  const rooms = await db.queryAll(query, params);
  res.json(rooms);
});

const publicBookingSchema = z.object({
  room_type_id: z.string().min(1, 'room_type_id is required'),
  check_in_date: dateString,
  check_out_date: dateString,
  guest: z.object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
  }),
  // Where Paystack sends the guest's browser back to after paying, e.g. the WordPress
  // page they booked from. Optional — Paystack falls back to its dashboard-configured
  // default when omitted.
  callback_url: z.string().url().optional(),
});

// Create a pending booking from an external channel (e.g. the WordPress plugin) and start
// a Paystack transaction for it. The booking is only confirmed once the guest actually pays
// (see confirmBookingPayment, invoked from the Paystack webhook) — a pending booking does not
// hold the room, matching the existing availability predicate below.
publicRouter.post('/bookings', requireApiPermission('write'), validate(publicBookingSchema), async (req: ApiKeyRequest, res: Response) => {
  const hotelId = req.apiKeyAuth!.hotelId;
  const { room_type_id, check_in_date, check_out_date, guest, callback_url } = req.body;

  if (check_out_date <= check_in_date) {
    return res.status(400).json({ error: 'check_out_date must be after check_in_date' });
  }

  if (!isConfigured()) {
    return res.status(500).json({ error: 'Payment gateway not configured. Set PAYSTACK_SECRET_KEY in server/.env' });
  }

  const roomType = await db.queryOne('SELECT * FROM room_types WHERE id = ? AND hotel_id = ?', [room_type_id, hotelId]);
  if (!roomType) return res.status(400).json({ error: 'Room type not found' });

  const room = await db.queryOne(`
    SELECT r.* FROM rooms r
    WHERE r.hotel_id = ? AND r.room_type_id = ? AND r.status != 'maintenance'
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.room_id = r.id AND b.status IN ('confirmed', 'checked_in')
      AND b.check_in_date < ? AND b.check_out_date > ?
    )
    ORDER BY r.room_number ASC LIMIT 1
  `, [hotelId, room_type_id, check_out_date, check_in_date]);
  if (!room) return res.status(400).json({ error: 'No rooms of this type are available for the selected dates' });

  let existingGuest = await db.queryOne('SELECT id FROM guests WHERE email = ? AND hotel_id = ?', [guest.email, hotelId]);
  let guestId: string;
  if (existingGuest) {
    guestId = existingGuest.id;
  } else {
    guestId = uuid();
    await db.execute(
      'INSERT INTO guests (id, hotel_id, first_name, last_name, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [guestId, hotelId, guest.first_name, guest.last_name, guest.email, guest.phone]
    );
  }

  const checkIn = new Date(check_in_date);
  const checkOut = new Date(check_out_date);
  const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
  const totalAmount = nights * roomType.base_price;

  const bookingId = uuid();
  await db.execute(
    'INSERT INTO bookings (id, hotel_id, guest_id, room_id, check_in_date, check_out_date, total_amount, source, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [bookingId, hotelId, guestId, room.id, check_in_date, check_out_date, totalAmount, 'online', 'pending']
  );

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);
  const invoiceId = uuid();
  await db.execute(
    'INSERT INTO invoices (id, hotel_id, booking_id, amount, due_date) VALUES (?, ?, ?, ?, ?)',
    [invoiceId, hotelId, bookingId, totalAmount, dueDate.toISOString().split('T')[0]]
  );

  // Store as pesewas (GHS * 100), same convention as the subscription-payment flow.
  const amountInPesewas = Math.round(totalAmount * 100);

  let payment;
  try {
    payment = await initializeTransaction({
      email: guest.email,
      amount: amountInPesewas,
      callback_url,
      metadata: { hotel_id: hotelId, booking_id: bookingId, type: 'booking' },
    });
  } catch (err: any) {
    return res.status(502).json({ error: err.message || 'Payment initialization failed' });
  }

  await db.execute(
    `INSERT INTO booking_payments (id, hotel_id, booking_id, amount, paystack_reference, paystack_access_code, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [uuid(), hotelId, bookingId, totalAmount, payment.reference, payment.access_code]
  );

  res.status(201).json({
    booking_id: bookingId,
    room_number: room.room_number,
    room_type: roomType.name,
    check_in_date,
    check_out_date,
    nights,
    total_amount: totalAmount,
    status: 'pending',
    payment: {
      authorization_url: payment.authorization_url,
      reference: payment.reference,
    },
  });
});

// Shared by the Paystack webhook to confirm a guest booking once its payment succeeds.
// Guards on booking_payments.status the same way activateSubscriptionForPayment does, so a
// re-delivered webhook event is a no-op.
export async function confirmBookingPayment(payment: any): Promise<void> {
  if (payment.status === 'success') return;

  const booking = await db.queryOne('SELECT * FROM bookings WHERE id = ?', [payment.booking_id]);
  if (!booking) return;

  try {
    await db.execute("UPDATE bookings SET status = 'confirmed', updated_at = NOW() WHERE id = ?", [booking.id]);
  } catch (err: any) {
    if (err.code === EXCLUSION_VIOLATION) {
      // The room was booked out from under this (already-paid) reservation by another
      // confirmed booking before this payment cleared. Leave the booking pending and flag it
      // for staff to manually resolve (reassign a room or refund the guest) rather than
      // silently losing track of captured money.
      await db.execute("UPDATE booking_payments SET status = 'success', paid_at = NOW() WHERE id = ?", [payment.id]);
      await createNotification(
        booking.hotel_id, 'booking', 'Booking conflict needs attention',
        `Payment succeeded for a booking on a room that was taken by another confirmed booking in the meantime. Please contact the guest to reassign or refund.`,
        `/bookings/${booking.id}`
      );
      return;
    }
    throw err;
  }

  const invoice = await db.queryOne('SELECT * FROM invoices WHERE booking_id = ?', [booking.id]);
  if (invoice) {
    await db.execute("UPDATE invoices SET paid_amount = ?, status = 'paid' WHERE id = ?", [invoice.amount, invoice.id]);
    await db.execute(
      'INSERT INTO payments (id, invoice_id, amount, method, reference, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [uuid(), invoice.id, invoice.amount, 'online', payment.paystack_reference || '', 'Paystack online payment']
    );
  }

  await db.execute("UPDATE booking_payments SET status = 'success', paid_at = NOW() WHERE id = ?", [payment.id]);

  const guest = await db.queryOne('SELECT * FROM guests WHERE id = ?', [booking.guest_id]);
  const room = await db.queryOne('SELECT * FROM rooms WHERE id = ?', [booking.room_id]);
  if (guest && room) {
    sendBookingConfirmation(guest.email, {
      guestName: `${guest.first_name} ${guest.last_name}`,
      roomNumber: room.room_number,
      checkIn: booking.check_in_date,
      checkOut: booking.check_out_date,
      totalAmount: booking.total_amount,
      bookingId: booking.id,
    });
    await createNotification(booking.hotel_id, 'booking', 'New Booking', `${guest.first_name} ${guest.last_name} booked room ${room.room_number} via website`, `/bookings/${booking.id}`);
  }
}
