import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { sendBookingConfirmation, sendCheckInNotification, sendCheckOutReceipt } from '../services/email.js';
import { AuthRequest } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

export const bookingsRouter = Router();
const db = getDb();

bookingsRouter.get('/', (req: AuthRequest, res: Response) => {
  const { status, page: pageStr, limit: limitStr } = req.query;
  const hasPagination = pageStr !== undefined;
  const page = Math.max(1, parseInt(pageStr as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(limitStr as string) || 200));
  const offset = (page - 1) * limit;

  let query = `
    SELECT b.*, g.first_name || ' ' || g.last_name as guest_name, g.email as guest_email,
           g.phone as guest_phone, r.room_number, rt.name as room_type_name
    FROM bookings b
    JOIN guests g ON b.guest_id = g.id
    JOIN rooms r ON b.room_id = r.id
    JOIN room_types rt ON r.room_type_id = rt.id
    WHERE b.hotel_id = ?
  `;
  let countQuery = `
    SELECT COUNT(*) as total FROM bookings b WHERE b.hotel_id = ?
  `;
  const params: string[] = [req.user!.hotel_id];
  const countParams: string[] = [req.user!.hotel_id];
  if (status) {
    query += ' AND b.status = ?';
    countQuery += ' AND b.status = ?';
    params.push(status as string);
    countParams.push(status as string);
  }
  query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
  params.push(String(limit), String(offset));

  const bookings = db.queryAll(query, params);
  const { total } = db.queryOne(countQuery, countParams) || { total: 0 };

  if (hasPagination) {
    res.json({ data: bookings, total, page, limit });
  } else {
    res.json(bookings);
  }
});

bookingsRouter.get('/:id', (req: AuthRequest, res: Response) => {
  const booking = db.queryOne(`
    SELECT b.*, g.first_name || ' ' || g.last_name as guest_name, g.email as guest_email,
           g.phone as guest_phone, r.room_number, rt.name as room_type_name
    FROM bookings b
    JOIN guests g ON b.guest_id = g.id
    JOIN rooms r ON b.room_id = r.id
    JOIN room_types rt ON r.room_type_id = rt.id
    WHERE b.id = ? AND b.hotel_id = ?
  `, [req.params.id, req.user!.hotel_id]);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const services = db.queryAll(`
    SELECT bs.*, s.name as service_name, s.category
    FROM booking_services bs
    JOIN services s ON bs.service_id = s.id
    WHERE bs.booking_id = ?
  `, [req.params.id]);

  const invoice = db.queryOne('SELECT * FROM invoices WHERE booking_id = ?', [req.params.id]);

  res.json({ ...booking, services, invoice });
});

// --- Check-in ---
bookingsRouter.post('/:id/check-in', (req: AuthRequest, res: Response) => {
  const booking = db.queryOne('SELECT * FROM bookings WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status !== 'confirmed') return res.status(400).json({ error: 'Only confirmed bookings can be checked in' });

  const room = db.queryOne('SELECT * FROM rooms WHERE id = ?', [booking.room_id]);
  if (!room) return res.status(400).json({ error: 'Room not found' });
  if (room.status === 'occupied') return res.status(400).json({ error: 'Room is already occupied' });
  if (room.status === 'maintenance' || room.status === 'out_of_service') return res.status(400).json({ error: 'Room is not available' });

  db.execute("UPDATE rooms SET status = 'occupied', updated_at = datetime('now') WHERE id = ?", [booking.room_id]);
  db.execute("UPDATE bookings SET status = 'checked_in', actual_check_in = datetime('now'), updated_at = datetime('now') WHERE id = ?", [req.params.id]);

  const guest = db.queryOne('SELECT * FROM guests WHERE id = ?', [booking.guest_id]);
  if (guest) {
    sendCheckInNotification(guest.email, {
      guestName: `${guest.first_name} ${guest.last_name}`,
      roomNumber: room.room_number,
      checkOut: booking.check_out_date,
    });
  }

  const updated = db.queryOne(`
    SELECT b.*, g.first_name || ' ' || g.last_name as guest_name, r.room_number
    FROM bookings b JOIN guests g ON b.guest_id = g.id JOIN rooms r ON b.room_id = r.id WHERE b.id = ?
  `, [req.params.id]);
  createNotification(req.user!.hotel_id, 'check_in', 'Guest Checked In', `${updated.guest_name} checked into room ${updated.room_number}`, `/bookings/${req.params.id}`);
  res.json(updated);
});

// --- Check-out ---
bookingsRouter.post('/:id/check-out', (req: AuthRequest, res: Response) => {
  const booking = db.queryOne('SELECT * FROM bookings WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status !== 'checked_in') return res.status(400).json({ error: 'Only checked-in bookings can be checked out' });

  const room = db.queryOne('SELECT * FROM rooms WHERE id = ?', [booking.room_id]);
  const guest = db.queryOne('SELECT * FROM guests WHERE id = ?', [booking.guest_id]);

  // Calculate total including services
  const servicesTotal = db.queryOne(
    'SELECT COALESCE(SUM(price), 0) as total FROM booking_services WHERE booking_id = ?',
    [req.params.id]
  );
  const totalAmount = (booking.total_amount || 0) + (servicesTotal?.total || 0);

  // Upsert invoice
  let invoice = db.queryOne('SELECT * FROM invoices WHERE booking_id = ?', [req.params.id]);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);
  if (invoice) {
    db.execute('UPDATE invoices SET amount = ?, status = ?, due_date = ? WHERE id = ?', [totalAmount, 'paid', dueDate.toISOString().split('T')[0], invoice.id]);
  } else {
    const invoiceId = uuid();
    db.execute(
      'INSERT INTO invoices (id, hotel_id, booking_id, amount, paid_amount, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [invoiceId, req.user!.hotel_id, req.params.id, totalAmount, totalAmount, 'paid', dueDate.toISOString().split('T')[0]]
    );
    invoice = db.queryOne('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
  }

  db.execute("UPDATE rooms SET status = 'available', updated_at = datetime('now') WHERE id = ?", [booking.room_id]);
  db.execute("UPDATE bookings SET total_amount = ?, status = 'checked_out', actual_check_out = datetime('now'), updated_at = datetime('now') WHERE id = ?", [totalAmount, req.params.id]);

  if (guest) {
    sendCheckOutReceipt(guest.email, {
      guestName: `${guest.first_name} ${guest.last_name}`,
      roomNumber: room.room_number,
      totalAmount: totalAmount,
      invoiceId: invoice?.id || 'N/A',
    });
  }

  const updated = db.queryOne(`
    SELECT b.*, g.first_name || ' ' || g.last_name as guest_name, r.room_number
    FROM bookings b JOIN guests g ON b.guest_id = g.id JOIN rooms r ON b.room_id = r.id WHERE b.id = ?
  `, [req.params.id]);
  createNotification(req.user!.hotel_id, 'check_out', 'Guest Checked Out', `${updated.guest_name} checked out of room ${updated.room_number}`, `/bookings/${req.params.id}`);
  res.json(updated);
});

bookingsRouter.post('/', (req: AuthRequest, res: Response) => {
  const { guest_id, room_id, check_in_date, check_out_date, source = 'walk_in', status = 'confirmed' } = req.body;
  if (!guest_id || !room_id || !check_in_date || !check_out_date) {
    return res.status(400).json({ error: 'guest_id, room_id, check_in_date, check_out_date are required' });
  }
  const validSources = ['walk_in', 'online', 'phone', 'corporate', 'group'];
  if (!validSources.includes(source)) {
    return res.status(400).json({ error: `Invalid source. Must be one of: ${validSources.join(', ')}` });
  }

  const room = db.queryOne('SELECT * FROM rooms WHERE id = ? AND hotel_id = ?', [room_id, req.user!.hotel_id]);
  if (!room) return res.status(400).json({ error: 'Room not found' });
  if (room.status === 'maintenance') return res.status(400).json({ error: 'Room is under maintenance' });

  const overlapping = db.queryOne(`
    SELECT COUNT(*) as count FROM bookings
    WHERE room_id = ? AND status IN ('confirmed', 'checked_in')
    AND check_in_date < ? AND check_out_date > ?
  `, [room_id, check_out_date, check_in_date]);
  if ((overlapping?.count || 0) > 0) return res.status(400).json({ error: 'Room is already booked for these dates' });

  const roomType = db.queryOne('SELECT * FROM room_types WHERE id = ?', [room.room_type_id]);
  const checkIn = new Date(check_in_date);
  const checkOut = new Date(check_out_date);
  const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
  const totalAmount = nights * roomType.base_price;

  const id = uuid();
  db.execute(
    'INSERT INTO bookings (id, hotel_id, guest_id, room_id, check_in_date, check_out_date, total_amount, source, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.user!.hotel_id, guest_id, room_id, check_in_date, check_out_date, totalAmount, source, status]
  );

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);
  db.execute(
    'INSERT INTO invoices (id, hotel_id, booking_id, amount, due_date) VALUES (?, ?, ?, ?, ?)',
    [uuid(), req.user!.hotel_id, id, totalAmount, dueDate.toISOString().split('T')[0]]
  );

  const created = db.queryOne(`
    SELECT b.*, g.first_name || ' ' || g.last_name as guest_name, g.email as guest_email, r.room_number
    FROM bookings b JOIN guests g ON b.guest_id = g.id JOIN rooms r ON b.room_id = r.id WHERE b.id = ?
  `, [id]);
  sendBookingConfirmation(created.guest_email, {
    guestName: created.guest_name,
    roomNumber: created.room_number,
    checkIn: created.check_in_date,
    checkOut: created.check_out_date,
    totalAmount: created.total_amount,
    bookingId: created.id,
  });
  createNotification(req.user!.hotel_id, 'booking', 'New Booking', `${created.guest_name} booked room ${created.room_number}`, `/bookings/${id}`);
  res.status(201).json(created);
});

bookingsRouter.put('/:id', (req: AuthRequest, res: Response) => {
  const existing = db.queryOne('SELECT * FROM bookings WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Booking not found' });

  const { check_in_date, check_out_date, status, source } = req.body;

  if (status === 'checked_in') {
    db.execute("UPDATE rooms SET status = 'occupied', updated_at = datetime('now') WHERE id = ?", [existing.room_id]);
    const guest = db.queryOne('SELECT * FROM guests WHERE id = ?', [existing.guest_id]);
    const room = db.queryOne('SELECT * FROM rooms WHERE id = ?', [existing.room_id]);
    if (guest) {
      sendCheckInNotification(guest.email, {
        guestName: `${guest.first_name} ${guest.last_name}`,
        roomNumber: room.room_number,
        checkOut: existing.check_out_date,
      });
    }
    createNotification(req.user!.hotel_id, 'check_in', 'Guest Checked In', `${existing.guest_name} checked into room ${room?.room_number || ''}`, `/bookings/${req.params.id}`);
  }
  if (status === 'checked_out' || status === 'cancelled' || status === 'no_show') {
    db.execute("UPDATE rooms SET status = 'available', updated_at = datetime('now') WHERE id = ?", [existing.room_id]);
    if (status === 'checked_out') {
      createNotification(req.user!.hotel_id, 'check_out', 'Guest Checked Out', `${existing.guest_name} checked out`, `/bookings/${req.params.id}`);
    } else if (status === 'cancelled') {
      createNotification(req.user!.hotel_id, 'cancellation', 'Booking Cancelled', `Booking for ${existing.guest_name} was cancelled`, `/bookings/${req.params.id}`);
    }
  }

  db.execute(
    "UPDATE bookings SET check_in_date = ?, check_out_date = ?, status = ?, source = ?, updated_at = datetime('now') WHERE id = ? AND hotel_id = ?",
    [check_in_date ?? existing.check_in_date, check_out_date ?? existing.check_out_date, status ?? existing.status, source ?? existing.source, req.params.id, req.user!.hotel_id]
  );

  if (status === 'checked_out') {
    const invoice = db.queryOne('SELECT * FROM invoices WHERE booking_id = ?', [req.params.id]);
    if (invoice) {
      db.execute('UPDATE invoices SET status = ?, paid_amount = amount WHERE id = ?', ['paid', invoice.id]);
    }
    const guest = db.queryOne('SELECT * FROM guests WHERE id = ?', [existing.guest_id]);
    const room = db.queryOne('SELECT * FROM rooms WHERE id = ?', [existing.room_id]);
    if (guest) {
      sendCheckOutReceipt(guest.email, {
        guestName: `${guest.first_name} ${guest.last_name}`,
        roomNumber: room.room_number,
        totalAmount: existing.total_amount,
        invoiceId: invoice?.id || 'N/A',
      });
    }
  }

  const updated = db.queryOne(`
    SELECT b.*, g.first_name || ' ' || g.last_name as guest_name, r.room_number
    FROM bookings b JOIN guests g ON b.guest_id = g.id JOIN rooms r ON b.room_id = r.id WHERE b.id = ?
  `, [req.params.id]);
  res.json(updated);
});

bookingsRouter.post('/:id/services', (req: AuthRequest, res: Response) => {
  const { service_id, quantity } = req.body;
  if (!service_id) return res.status(400).json({ error: 'service_id is required' });

  const booking = db.queryOne('SELECT * FROM bookings WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const service = db.queryOne('SELECT * FROM services WHERE id = ? AND hotel_id = ?', [service_id, req.user!.hotel_id]);
  if (!service) return res.status(400).json({ error: 'Service not found' });

  const qty = quantity || 1;
  const id = uuid();
  db.execute(
    'INSERT INTO booking_services (id, booking_id, service_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
    [id, req.params.id, service_id, qty, service.price * qty]
  );

  const totalRow = db.queryOne(
    'SELECT COALESCE(SUM(price), 0) as total FROM booking_services WHERE booking_id = ?',
    [req.params.id]
  );

  const room = db.queryOne('SELECT * FROM rooms WHERE id = ?', [booking.room_id]);
  const roomType = db.queryOne('SELECT * FROM room_types WHERE id = ?', [room.room_type_id]);
  const checkIn = new Date(booking.check_in_date);
  const checkOut = new Date(booking.check_out_date);
  const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
  const newTotal = nights * roomType.base_price + totalRow.total;

  db.execute("UPDATE bookings SET total_amount = ?, updated_at = datetime('now') WHERE id = ?", [newTotal, req.params.id]);

  const invoice = db.queryOne('SELECT * FROM invoices WHERE booking_id = ?', [req.params.id]);
  if (invoice) {
    db.execute('UPDATE invoices SET amount = ? WHERE id = ?', [newTotal, invoice.id]);
  }

  const created = db.queryOne(`
    SELECT bs.*, s.name as service_name, s.category
    FROM booking_services bs JOIN services s ON bs.service_id = s.id WHERE bs.id = ?
  `, [id]);
  res.status(201).json(created);
});

bookingsRouter.delete('/:id/services/:serviceId', (req: AuthRequest, res: Response) => {
  const booking = db.queryOne('SELECT * FROM bookings WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const existing = db.queryOne('SELECT * FROM booking_services WHERE id = ? AND booking_id = ?', [req.params.serviceId, req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Booking service not found' });

  db.execute('DELETE FROM booking_services WHERE id = ?', [req.params.serviceId]);

  const totalRow = db.queryOne(
    'SELECT COALESCE(SUM(price), 0) as total FROM booking_services WHERE booking_id = ?',
    [req.params.id]
  );

  const room = db.queryOne('SELECT * FROM rooms WHERE id = ?', [booking.room_id]);
  const roomType = db.queryOne('SELECT * FROM room_types WHERE id = ?', [room.room_type_id]);
  const checkIn = new Date(booking.check_in_date);
  const checkOut = new Date(booking.check_out_date);
  const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
  const newTotal = nights * roomType.base_price + totalRow.total;

  db.execute("UPDATE bookings SET total_amount = ?, updated_at = datetime('now') WHERE id = ?", [newTotal, req.params.id]);

  const invoice = db.queryOne('SELECT * FROM invoices WHERE booking_id = ?', [req.params.id]);
  if (invoice) {
    db.execute('UPDATE invoices SET amount = ? WHERE id = ?', [newTotal, invoice.id]);
  }

  res.json({ message: 'Service removed from booking' });
});
