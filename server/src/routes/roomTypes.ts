import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export const roomTypesRouter = Router();
const db = getDb();

roomTypesRouter.get('/', async (req: AuthRequest, res: Response) => {
  const types = await db.queryAll('SELECT * FROM room_types WHERE hotel_id = ? ORDER BY name', [req.user!.hotel_id]);
  res.json(types);
});

roomTypesRouter.post('/', async (req: AuthRequest, res: Response) => {
  const { name, description, base_price, capacity } = req.body;
  if (!name || !base_price) {
    return res.status(400).json({ error: 'name and base_price are required' });
  }
  const id = uuid();
  await db.execute(
    'INSERT INTO room_types (id, hotel_id, name, description, base_price, capacity) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.user!.hotel_id, name, description || '', Number(base_price), capacity || 1]
  );
  const created = await db.queryOne('SELECT * FROM room_types WHERE id = ?', [id]);
  res.status(201).json(created);
});

roomTypesRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await db.queryOne('SELECT * FROM room_types WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Room type not found' });

  const { name, description, base_price, capacity } = req.body;
  await db.execute(
    'UPDATE room_types SET name = ?, description = ?, base_price = ?, capacity = ? WHERE id = ? AND hotel_id = ?',
    [name ?? existing.name, description ?? existing.description, base_price ?? existing.base_price, capacity ?? existing.capacity, req.params.id, req.user!.hotel_id]
  );
  const updated = await db.queryOne('SELECT * FROM room_types WHERE id = ?', [req.params.id]);
  res.json(updated);
});

roomTypesRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await db.queryOne('SELECT * FROM room_types WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Room type not found' });
  const roomsUsingType = await db.queryOne('SELECT COUNT(*) as count FROM rooms WHERE room_type_id = ?', [req.params.id]);
  if (roomsUsingType.count > 0) {
    return res.status(400).json({ error: 'Cannot delete a room type with rooms assigned to it. Reassign or delete those rooms first.' });
  }
  await db.execute('DELETE FROM room_types WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  res.json({ message: 'Room type deleted' });
});
