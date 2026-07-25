import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

export const roomServiceRouter = Router();
const db = getDb();

roomServiceRouter.get('/', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const { status, request_type, room_id } = req.query;
  let query = `SELECT s.*, r.room_number, e.first_name || ' ' || e.last_name as assigned_name
    FROM room_service_requests s
    JOIN rooms r ON s.room_id = r.id
    LEFT JOIN employees e ON s.assigned_to = e.id
    WHERE s.hotel_id = ?`;
  const params: string[] = [String(hotelId)];
  if (status) { query += ' AND s.status = ?'; params.push(status as string); }
  if (request_type) { query += ' AND s.request_type = ?'; params.push(request_type as string); }
  if (room_id) { query += ' AND s.room_id = ?'; params.push(room_id as string); }
  query += ' ORDER BY s.created_at DESC';
  const requests = await db.queryAll(query, params);
  res.json(requests);
});

roomServiceRouter.post('/', async (req: AuthRequest, res: Response) => {
  const { booking_id, room_id, guest_name, request_type, description, assigned_to, notes } = req.body;
  if (!room_id || !request_type || !description) return res.status(400).json({ error: 'room_id, request_type, and description are required' });
  const hotelId = req.user?.hotel_id;
  const room = await db.queryOne('SELECT id FROM rooms WHERE id = ? AND hotel_id = ?', [room_id, String(hotelId)]);
  if (!room) return res.status(400).json({ error: 'Room not found' });
  if (booking_id) {
    const booking = await db.queryOne('SELECT id FROM bookings WHERE id = ? AND hotel_id = ?', [booking_id, String(hotelId)]);
    if (!booking) return res.status(400).json({ error: 'Booking not found' });
  }
  if (assigned_to) {
    const employee = await db.queryOne('SELECT id FROM employees WHERE id = ? AND hotel_id = ?', [assigned_to, String(hotelId)]);
    if (!employee) return res.status(400).json({ error: 'Employee not found' });
  }
  const id = uuid();
  await db.execute(
    'INSERT INTO room_service_requests (id, hotel_id, booking_id, room_id, guest_name, request_type, description, assigned_to, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, String(hotelId), booking_id || null, room_id, guest_name || '', request_type, description, assigned_to || null, notes || '']
  );
  const created = await db.queryOne(`SELECT s.*, r.room_number FROM room_service_requests s JOIN rooms r ON s.room_id = r.id WHERE s.id = ?`, [id]);
  await createNotification(String(hotelId), 'room_service', 'Room Service Request', `${created.guest_name || 'Guest'} requested ${created.request_type} for room ${created.room_number}`, `/room-service`);
  res.status(201).json(created);
});

roomServiceRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const existing = await db.queryOne('SELECT * FROM room_service_requests WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  if (!existing) return res.status(404).json({ error: 'Request not found' });
  const { booking_id, room_id, guest_name, request_type, description, status, assigned_to, notes } = req.body;
  if (room_id) {
    const room = await db.queryOne('SELECT id FROM rooms WHERE id = ? AND hotel_id = ?', [room_id, String(hotelId)]);
    if (!room) return res.status(400).json({ error: 'Room not found' });
  }
  if (booking_id) {
    const booking = await db.queryOne('SELECT id FROM bookings WHERE id = ? AND hotel_id = ?', [booking_id, String(hotelId)]);
    if (!booking) return res.status(400).json({ error: 'Booking not found' });
  }
  if (assigned_to) {
    const employee = await db.queryOne('SELECT id FROM employees WHERE id = ? AND hotel_id = ?', [assigned_to, String(hotelId)]);
    if (!employee) return res.status(400).json({ error: 'Employee not found' });
  }
  await db.execute(
    'UPDATE room_service_requests SET booking_id = ?, room_id = ?, guest_name = ?, request_type = ?, description = ?, status = ?, assigned_to = ?, notes = ? WHERE id = ? AND hotel_id = ?',
    [booking_id ?? existing.booking_id, room_id ?? existing.room_id, guest_name ?? existing.guest_name,
     request_type ?? existing.request_type, description ?? existing.description, status ?? existing.status,
     assigned_to ?? existing.assigned_to, notes ?? existing.notes, req.params.id, String(hotelId)]
  );
  const updated = await db.queryOne(`SELECT s.*, r.room_number FROM room_service_requests s JOIN rooms r ON s.room_id = r.id WHERE s.id = ?`, [req.params.id]);
  res.json(updated);
});

roomServiceRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const existing = await db.queryOne('SELECT * FROM room_service_requests WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  if (!existing) return res.status(404).json({ error: 'Request not found' });
  await db.execute('DELETE FROM room_service_requests WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  res.json({ message: 'Request deleted' });
});
