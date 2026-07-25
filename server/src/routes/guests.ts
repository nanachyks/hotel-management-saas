import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export const guestsRouter = Router();
const db = getDb();

guestsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const { search, page: pageStr, limit: limitStr } = req.query;
  const hasPagination = pageStr !== undefined;
  const page = Math.max(1, parseInt(pageStr as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(limitStr as string) || 200));
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM guests WHERE hotel_id = ?';
  let countQuery = 'SELECT COUNT(*) as total FROM guests WHERE hotel_id = ?';
  const params: string[] = [req.user!.hotel_id];
  const countParams: string[] = [req.user!.hotel_id];
  if (search) {
    query += ' AND (first_name ILIKE ? OR last_name ILIKE ? OR email ILIKE ? OR phone ILIKE ?)';
    countQuery += ' AND (first_name ILIKE ? OR last_name ILIKE ? OR email ILIKE ? OR phone ILIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
    countParams.push(s, s, s, s);
  }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(String(limit), String(offset));

  const guests = await db.queryAll(query, params);
  const { total } = (await db.queryOne(countQuery, countParams)) || { total: 0 };

  if (hasPagination) {
    res.json({ data: guests, total, page, limit });
  } else {
    res.json(guests);
  }
});

guestsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const guest = await db.queryOne('SELECT * FROM guests WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!guest) return res.status(404).json({ error: 'Guest not found' });
  res.json(guest);
});

guestsRouter.post('/', async (req: AuthRequest, res: Response) => {
  const { first_name, last_name, email, phone, whatsapp, id_card_number, address } = req.body;
  if (!first_name || !last_name || !email || !phone) {
    return res.status(400).json({ error: 'first_name, last_name, email, and phone are required' });
  }
  const id = uuid();
  await db.execute(
    'INSERT INTO guests (id, hotel_id, first_name, last_name, email, phone, whatsapp, id_card_number, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.user!.hotel_id, first_name, last_name, email, phone, whatsapp || '', id_card_number || '', address || '']
  );
  const created = await db.queryOne('SELECT * FROM guests WHERE id = ?', [id]);
  res.status(201).json(created);
});

guestsRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await db.queryOne('SELECT * FROM guests WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Guest not found' });

  const { first_name, last_name, email, phone, whatsapp, id_card_number, address } = req.body;
  await db.execute(
    "UPDATE guests SET first_name = ?, last_name = ?, email = ?, phone = ?, whatsapp = ?, id_card_number = ?, address = ?, updated_at = NOW() WHERE id = ? AND hotel_id = ?",
    [first_name ?? existing.first_name, last_name ?? existing.last_name, email ?? existing.email, phone ?? existing.phone,
     (whatsapp ?? existing.whatsapp) || '', id_card_number ?? existing.id_card_number, address ?? existing.address, req.params.id, req.user!.hotel_id]
  );
  const updated = await db.queryOne('SELECT * FROM guests WHERE id = ?', [req.params.id]);
  res.json(updated);
});

guestsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await db.queryOne('SELECT * FROM guests WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Guest not found' });
  await db.execute('DELETE FROM guests WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  res.json({ message: 'Guest deleted' });
});
