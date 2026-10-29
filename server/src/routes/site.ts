import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDb } from '../db.js';
import { validate } from '../middleware/validate.js';
import { listAvailableRooms, createPendingBooking, OnlineBookingInput } from './public.js';
import { getSubscriptionGateStatus } from './subscriptions.js';

// Unauthenticated, slug-keyed endpoints that power each hotel's public booking
// website (client route /stay/:slug). Unlike the /api/public WordPress-plugin
// API these carry NO secrets in the browser — the hotel slug is the only scope.
// Everything sensitive (photos of guests, internal notes) is deliberately kept
// out of these responses.

export const siteRouter = Router();
const db = getDb();

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a date in YYYY-MM-DD format');

async function getActiveHotel(slug: string) {
  return db.queryOne(
    `SELECT id, name, slug, email, phone, address, logo_url, currency, tax_rate, timezone, check_in_time, check_out_time
     FROM hotels WHERE slug = ? AND status = 'active'`,
    [slug]
  );
}

// Hotel profile + room types for the published site
siteRouter.get('/:slug', async (req: Request, res: Response) => {
  const hotel = await getActiveHotel(req.params.slug);
  if (!hotel) return res.status(404).json({ error: 'Hotel not found' });

  const roomTypes = await db.queryAll(
    `SELECT id, name, description, base_price, capacity,
            (SELECT photo FROM rooms WHERE room_type_id = rt.id AND photo IS NOT NULL ORDER BY room_number ASC LIMIT 1) as photo
     FROM room_types rt
     WHERE hotel_id = ?
     ORDER BY base_price ASC`,
    [hotel.id]
  );

  res.json({ hotel, room_types: roomTypes });
});

const availabilitySchema = z.object({
  check_in: dateString,
  check_out: dateString,
  room_type_id: z.string().optional(),
});

siteRouter.get('/:slug/availability', async (req: Request, res: Response) => {
  const hotel = await getActiveHotel(req.params.slug);
  if (!hotel) return res.status(404).json({ error: 'Hotel not found' });

  const parsed = availabilitySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'check_in and check_out (YYYY-MM-DD) are required' });
  }
  const { check_in, check_out, room_type_id } = parsed.data;
  if (check_out <= check_in) {
    return res.status(400).json({ error: 'check_out must be after check_in' });
  }

  const rooms = await listAvailableRooms(hotel.id, check_in, check_out, room_type_id);
  // Aggregate to counts per room type for the website's UI
  const counts: Record<string, { room_type_id: string; room_type_name: string; base_price: number; capacity: number; available: number }> = {};
  for (const r of rooms as any[]) {
    const entry = counts[r.room_type_id] || {
      room_type_id: r.room_type_id,
      room_type_name: r.room_type_name,
      base_price: r.base_price,
      capacity: r.capacity,
      available: 0,
    };
    entry.available++;
    counts[r.room_type_id] = entry;
  }
  res.json(Object.values(counts));
});

// Site routes have no logged-in user — the gate body comes from req.siteHotel
// resolved by slug. Keeps the showcase (GET) open but the booking (POST) gated:
// a lapsed subscription pauses the site's booking, which is the renewal lever.
declare module 'express-serve-static-core' {
  interface Request {
    siteHotel?: any;
  }
}

async function gateBookings(req: Request, res: Response, next: any) {
  try {
    const hotel = await getActiveHotel(req.params.slug);
    if (!hotel) return res.status(404).json({ error: 'Hotel not found' });
    (req as any).siteHotel = hotel;
    const status = await getSubscriptionGateStatus(hotel.id);
    if (!status.active) return res.status(402).json({ error: 'This property is not accepting online bookings right now. Please contact the hotel directly.', code: 'SUBSCRIPTION_REQUIRED' });
    next();
  } catch (e) { next(e); }
}

const siteBookingSchema = z.object({
  room_type_id: z.string().min(1, 'room_type_id is required'),
  check_in_date: dateString,
  check_out_date: dateString,
  guest: z.object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
  }),
});

// Guest books straight from the hotel's website. Same payment flow as the
// plugin: Paystack holds the room as pending until the charge succeeds.
// Gated on the hotel's own subscription via gateBookings.
siteRouter.post('/:slug/bookings', gateBookings, validate(siteBookingSchema), async (req: Request, res: Response) => {
  const hotel = req.siteHotel;
  if (!hotel) return res.status(404).json({ error: 'Hotel not found' });

  // Send the guest back to their own booking page after paying, unless the
  // caller (e.g. an embedded checkout) provided a specific callback.
  const callbackUrl =
    req.body.callback_url ||
    `${req.protocol}://${req.get('host')}/stay/${hotel.slug}?booking=thank-you`;

  const { status, body } = await createPendingBooking(hotel.id, { ...req.body, callback_url: callbackUrl } as OnlineBookingInput);
  return res.status(status).json(body);
});
