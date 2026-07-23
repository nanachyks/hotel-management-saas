import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export const roomsRouter = Router();
const db = getDb();

const uploadsDir = path.join(import.meta.dirname, '..', '..', 'uploads', 'rooms');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuid()}${ext}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

roomsRouter.get('/', (req: AuthRequest, res: Response) => {
  const { status, floor, search, page: pageStr, limit: limitStr } = req.query;
  const hasPagination = pageStr !== undefined;
  const page = Math.max(1, parseInt(pageStr as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(limitStr as string) || 200));
  const offset = (page - 1) * limit;

  let query = `
    SELECT r.*, rt.name as room_type_name, rt.base_price, rt.capacity as room_type_capacity
    FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id
    WHERE r.hotel_id = ?
  `;
  let countQuery = 'SELECT COUNT(*) as total FROM rooms r WHERE r.hotel_id = ?';
  const params: string[] = [req.user!.hotel_id];
  const countParams: string[] = [req.user!.hotel_id];

  if (status) {
    query += ' AND r.status = ?';
    countQuery += ' AND r.status = ?';
    params.push(status as string);
    countParams.push(status as string);
  }
  if (floor) {
    query += ' AND r.floor = ?';
    countQuery += ' AND r.floor = ?';
    params.push(floor as string);
    countParams.push(floor as string);
  }
  if (search) {
    const s = `%${search}%`;
    query += ' AND (r.room_number LIKE ? OR r.amenities LIKE ? OR r.notes LIKE ? OR rt.name LIKE ?)';
    countQuery += ' AND (r.room_number LIKE ? OR r.amenities LIKE ? OR r.notes LIKE ? OR rt.name LIKE ?)';
    params.push(s, s, s, s);
    countParams.push(s, s, s, s);
  }
  query += ' ORDER BY r.floor, r.room_number LIMIT ? OFFSET ?';
  params.push(String(limit), String(offset));

  const rooms = db.queryAll(query, params);
  const { total } = db.queryOne(countQuery, countParams) || { total: 0 };

  if (hasPagination) {
    res.json({ data: rooms, total, page, limit });
  } else {
    res.json(rooms);
  }
});

roomsRouter.get('/availability', (req: AuthRequest, res: Response) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to query params required (YYYY-MM-DD)' });

  const rooms = db.queryAll(`
    SELECT r.*, rt.name as room_type_name, rt.base_price, rt.capacity as room_type_capacity
    FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id
    WHERE r.hotel_id = ? ORDER BY r.room_number
  `, [req.user!.hotel_id]);

  const bookings = db.queryAll(`
    SELECT b.id, b.room_id, b.check_in_date, b.check_out_date, b.status,
           g.first_name || ' ' || g.last_name as guest_name
    FROM bookings b
    JOIN guests g ON b.guest_id = g.id
    JOIN rooms r ON b.room_id = r.id
    WHERE r.hotel_id = ?
    AND b.status IN ('confirmed', 'checked_in')
    AND b.check_in_date < ?
    AND b.check_out_date > ?
  `, [req.user!.hotel_id, to as string, from as string]);

  const start = new Date(from as string);
  const end = new Date(to as string);
  const dates: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }

  const result = rooms.map(room => {
    const roomBookings = bookings.filter((b: any) => b.room_id === room.id);
    const days: Record<string, any> = {};
    for (const date of dates) {
      const booking = roomBookings.find((b: any) => date >= b.check_in_date && date < b.check_out_date);
      if (booking) {
        days[date] = { status: 'booked', booking_id: booking.id, guest_name: booking.guest_name, booking_status: booking.status };
      } else if (room.status === 'maintenance' || room.status === 'out_of_service' || room.status === 'cleaning') {
        days[date] = { status: room.status };
      } else {
        days[date] = { status: 'available' };
      }
    }
    return { id: room.id, room_number: room.room_number, room_type_name: room.room_type_name, base_price: room.base_price, floor: room.floor, days };
  });

  res.json({ dates, rooms: result });
});

roomsRouter.get('/check-availability', (req: AuthRequest, res: Response) => {
  const { room_id, check_in, check_out } = req.query;
  if (!room_id || !check_in || !check_out) {
    return res.status(400).json({ error: 'room_id, check_in, check_out required' });
  }

  const overlapping = db.queryOne(`
    SELECT COUNT(*) as count FROM bookings
    WHERE room_id = ? AND status IN ('confirmed', 'checked_in')
    AND check_in_date < ? AND check_out_date > ?
  `, [room_id as string, check_out as string, check_in as string]);

  const room = db.queryOne('SELECT status FROM rooms WHERE id = ? AND hotel_id = ?', [room_id as string, req.user!.hotel_id]);

  const available = (overlapping?.count || 0) === 0 && room?.status !== 'maintenance' && room?.status !== 'out_of_service';
  res.json({ available, overlappingBookings: overlapping?.count || 0 });
});

roomsRouter.get('/floors', (req: AuthRequest, res: Response) => {
  const rooms = db.queryAll(`
    SELECT r.*, rt.name as room_type_name, rt.base_price, rt.capacity as room_type_capacity
    FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id
    WHERE r.hotel_id = ?
    ORDER BY r.floor, r.room_number
  `, [req.user!.hotel_id]);

  const floors: Record<number, any[]> = {};
  for (const room of rooms) {
    const fl = room.floor;
    if (!floors[fl]) floors[fl] = [];
    floors[fl].push(room);
  }
  res.json(floors);
});

roomsRouter.get('/:id', (req: AuthRequest, res: Response) => {
  const room = db.queryOne(`
    SELECT r.*, rt.name as room_type_name, rt.base_price, rt.capacity as room_type_capacity
    FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id
    WHERE r.id = ? AND r.hotel_id = ?
  `, [req.params.id, req.user!.hotel_id]);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

roomsRouter.post('/', (req: AuthRequest, res: Response) => {
  const { room_number, room_type_id, floor, status, amenities, notes, price, capacity } = req.body;
  if (!room_number || !room_type_id) {
    return res.status(400).json({ error: 'room_number and room_type_id are required' });
  }
  const typeExists = db.queryOne('SELECT id FROM room_types WHERE id = ? AND hotel_id = ?', [room_type_id, req.user!.hotel_id]);
  if (!typeExists) return res.status(400).json({ error: 'Room type not found' });

  const id = uuid();
  db.execute(
    'INSERT INTO rooms (id, hotel_id, room_number, room_type_id, floor, status, amenities, notes, price, capacity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.user!.hotel_id, room_number, room_type_id, floor || 1, status || 'available', amenities || '', notes || '', price ?? null, capacity ?? null]
  );

  const created = db.queryOne(`
    SELECT r.*, rt.name as room_type_name, rt.base_price, rt.capacity as room_type_capacity
    FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id WHERE r.id = ?
  `, [id]);
  res.status(201).json(created);
});

roomsRouter.put('/:id', (req: AuthRequest, res: Response) => {
  const existing = db.queryOne('SELECT * FROM rooms WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Room not found' });

  const { room_number, room_type_id, floor, status, amenities, notes, price, capacity } = req.body;
  db.execute(
    "UPDATE rooms SET room_number = ?, room_type_id = ?, floor = ?, status = ?, amenities = ?, notes = ?, price = ?, capacity = ?, updated_at = datetime('now') WHERE id = ? AND hotel_id = ?",
    [
      room_number ?? existing.room_number, room_type_id ?? existing.room_type_id,
      floor ?? existing.floor, status ?? existing.status,
      amenities ?? existing.amenities, notes ?? existing.notes,
      price !== undefined ? price : existing.price,
      capacity !== undefined ? capacity : existing.capacity,
      req.params.id, req.user!.hotel_id
    ]
  );
  const updated = db.queryOne(`
    SELECT r.*, rt.name as room_type_name, rt.base_price, rt.capacity as room_type_capacity
    FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id WHERE r.id = ?
  `, [req.params.id]);
  res.json(updated);
});

roomsRouter.post('/:id/photo', upload.single('photo'), (req: AuthRequest, res: Response) => {
  const existing = db.queryOne('SELECT * FROM rooms WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Room not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  if (existing.photo) {
    const oldPath = path.join(uploadsDir, existing.photo);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  db.execute("UPDATE rooms SET photo = ?, updated_at = datetime('now') WHERE id = ?", [req.file.filename, req.params.id]);
  res.json({ photo: req.file.filename });
});

roomsRouter.delete('/:id/photo', (req: AuthRequest, res: Response) => {
  const existing = db.queryOne('SELECT * FROM rooms WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Room not found' });
  if (!existing.photo) return res.status(404).json({ error: 'No photo to delete' });

  const filePath = path.join(uploadsDir, existing.photo);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.execute("UPDATE rooms SET photo = NULL, updated_at = datetime('now') WHERE id = ?", [req.params.id]);
  res.json({ message: 'Photo deleted' });
});

roomsRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  const existing = db.queryOne('SELECT * FROM rooms WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Room not found' });
  if (existing.photo) {
    const filePath = path.join(uploadsDir, existing.photo);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  db.execute('DELETE FROM rooms WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  res.json({ message: 'Room deleted' });
});
