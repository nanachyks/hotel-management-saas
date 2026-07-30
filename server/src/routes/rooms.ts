import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import path from 'path';
import { getDb } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';
import { uploadRoomPhoto, deleteRoomPhoto, extractRoomPhotoFilename } from '../storage.js';
import { getPlanLimits } from './subscriptions.js';

export const roomsRouter = Router();
const db = getDb();

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

roomsRouter.get('/', async (req: AuthRequest, res: Response) => {
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
    query += ' AND (r.room_number ILIKE ? OR r.amenities ILIKE ? OR r.notes ILIKE ? OR rt.name ILIKE ?)';
    countQuery += ' AND (r.room_number ILIKE ? OR r.amenities ILIKE ? OR r.notes ILIKE ? OR rt.name ILIKE ?)';
    params.push(s, s, s, s);
    countParams.push(s, s, s, s);
  }
  query += ' ORDER BY r.floor, r.room_number LIMIT ? OFFSET ?';
  params.push(String(limit), String(offset));

  const rooms = await db.queryAll(query, params);
  const { total } = (await db.queryOne(countQuery, countParams)) || { total: 0 };

  if (hasPagination) {
    res.json({ data: rooms, total, page, limit });
  } else {
    res.json(rooms);
  }
});

roomsRouter.get('/availability', async (req: AuthRequest, res: Response) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to query params required (YYYY-MM-DD)' });

  const rooms = await db.queryAll(`
    SELECT r.*, rt.name as room_type_name, rt.base_price, rt.capacity as room_type_capacity
    FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id
    WHERE r.hotel_id = ? ORDER BY r.room_number
  `, [req.user!.hotel_id]);

  const bookings = await db.queryAll(`
    SELECT b.id, b.room_id, b.check_in_date, b.check_out_date, b.status,
           g.first_name || ' ' || g.last_name as guest_name
    FROM bookings b
    JOIN guests g ON b.guest_id = g.id
    JOIN rooms r ON b.room_id = r.id
    WHERE r.hotel_id = ?
    AND b.status IN ('confirmed', 'checked_in', 'pending')
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

roomsRouter.get('/check-availability', async (req: AuthRequest, res: Response) => {
  const { room_id, check_in, check_out } = req.query;
  if (!room_id || !check_in || !check_out) {
    return res.status(400).json({ error: 'room_id, check_in, check_out required' });
  }

  const overlapping = await db.queryOne(`
    SELECT COUNT(*) as count FROM bookings
    WHERE room_id = ? AND status IN ('confirmed', 'checked_in', 'pending')
    AND check_in_date < ? AND check_out_date > ?
  `, [room_id as string, check_out as string, check_in as string]);

  const room = await db.queryOne('SELECT status FROM rooms WHERE id = ? AND hotel_id = ?', [room_id as string, req.user!.hotel_id]);

  const available = (overlapping?.count || 0) === 0 && room?.status !== 'maintenance' && room?.status !== 'out_of_service';
  res.json({ available, overlappingBookings: overlapping?.count || 0 });
});

roomsRouter.get('/floors', async (req: AuthRequest, res: Response) => {
  const rooms = await db.queryAll(`
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

roomsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const room = await db.queryOne(`
    SELECT r.*, rt.name as room_type_name, rt.base_price, rt.capacity as room_type_capacity
    FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id
    WHERE r.id = ? AND r.hotel_id = ?
  `, [req.params.id, req.user!.hotel_id]);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

roomsRouter.post('/', async (req: AuthRequest, res: Response) => {
  const { room_number, room_type_id, floor, status, amenities, notes, price, capacity } = req.body;
  if (!room_number || !room_type_id) {
    return res.status(400).json({ error: 'room_number and room_type_id are required' });
  }
  const typeExists = await db.queryOne('SELECT id FROM room_types WHERE id = ? AND hotel_id = ?', [room_type_id, req.user!.hotel_id]);
  if (!typeExists) return res.status(400).json({ error: 'Room type not found' });

  const { maxRooms } = await getPlanLimits(req.user!.hotel_id);
  const { count: roomCount } = (await db.queryOne('SELECT COUNT(*) as count FROM rooms WHERE hotel_id = ?', [req.user!.hotel_id])) || { count: 0 };
  if (roomCount >= maxRooms) {
    return res.status(402).json({ error: `Your plan allows up to ${maxRooms} rooms. Upgrade to add more.`, code: 'PLAN_LIMIT_REACHED' });
  }

  const id = uuid();
  await db.execute(
    'INSERT INTO rooms (id, hotel_id, room_number, room_type_id, floor, status, amenities, notes, price, capacity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.user!.hotel_id, room_number, room_type_id, floor || 1, status || 'available', amenities || '', notes || '', price ?? null, capacity ?? null]
  );

  const created = await db.queryOne(`
    SELECT r.*, rt.name as room_type_name, rt.base_price, rt.capacity as room_type_capacity
    FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id WHERE r.id = ?
  `, [id]);
  res.status(201).json(created);
});

roomsRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await db.queryOne('SELECT * FROM rooms WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Room not found' });

  const { room_number, room_type_id, floor, status, amenities, notes, price, capacity } = req.body;
  await db.execute(
    "UPDATE rooms SET room_number = ?, room_type_id = ?, floor = ?, status = ?, amenities = ?, notes = ?, price = ?, capacity = ?, updated_at = NOW() WHERE id = ? AND hotel_id = ?",
    [
      room_number ?? existing.room_number, room_type_id ?? existing.room_type_id,
      floor ?? existing.floor, status ?? existing.status,
      amenities ?? existing.amenities, notes ?? existing.notes,
      price !== undefined ? price : existing.price,
      capacity !== undefined ? capacity : existing.capacity,
      req.params.id, req.user!.hotel_id
    ]
  );
  const updated = await db.queryOne(`
    SELECT r.*, rt.name as room_type_name, rt.base_price, rt.capacity as room_type_capacity
    FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id WHERE r.id = ?
  `, [req.params.id]);
  res.json(updated);
});

roomsRouter.post('/:id/photo', upload.single('photo'), async (req: AuthRequest, res: Response) => {
  const existing = await db.queryOne('SELECT * FROM rooms WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Room not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  if (existing.photo) {
    await deleteRoomPhoto(extractRoomPhotoFilename(existing.photo));
  }

  const ext = path.extname(req.file.originalname) || '.jpg';
  const filename = `${uuid()}${ext}`;
  const photoUrl = await uploadRoomPhoto(filename, req.file.buffer, req.file.mimetype);

  await db.execute("UPDATE rooms SET photo = ?, updated_at = NOW() WHERE id = ?", [photoUrl, req.params.id]);
  res.json({ photo: photoUrl });
});

roomsRouter.delete('/:id/photo', async (req: AuthRequest, res: Response) => {
  const existing = await db.queryOne('SELECT * FROM rooms WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Room not found' });
  if (!existing.photo) return res.status(404).json({ error: 'No photo to delete' });

  await deleteRoomPhoto(extractRoomPhotoFilename(existing.photo));
  await db.execute("UPDATE rooms SET photo = NULL, updated_at = NOW() WHERE id = ?", [req.params.id]);
  res.json({ message: 'Photo deleted' });
});

roomsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await db.queryOne('SELECT * FROM rooms WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Room not found' });
  if (existing.photo) {
    await deleteRoomPhoto(extractRoomPhotoFilename(existing.photo));
  }
  await db.execute('DELETE FROM rooms WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  res.json({ message: 'Room deleted' });
});
