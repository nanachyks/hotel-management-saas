import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export const departmentsRouter = Router();
const db = getDb();

departmentsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const departments = await db.queryAll('SELECT * FROM departments WHERE hotel_id = ? ORDER BY name', [String(hotelId)]);
  res.json(departments);
});

departmentsRouter.post('/', async (req: AuthRequest, res: Response) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const hotelId = req.user?.hotel_id;
  const id = uuid();
  await db.execute('INSERT INTO departments (id, hotel_id, name, description) VALUES (?, ?, ?, ?)',
    [id, String(hotelId), name, description || '']);
  const created = await db.queryOne('SELECT * FROM departments WHERE id = ?', [id]);
  res.status(201).json(created);
});

departmentsRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const existing = await db.queryOne('SELECT * FROM departments WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  if (!existing) return res.status(404).json({ error: 'Department not found' });
  const { name, description } = req.body;
  await db.execute('UPDATE departments SET name = ?, description = ? WHERE id = ? AND hotel_id = ?',
    [name ?? existing.name, description ?? existing.description, req.params.id, String(hotelId)]);
  const updated = await db.queryOne('SELECT * FROM departments WHERE id = ?', [req.params.id]);
  res.json(updated);
});

departmentsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const existing = await db.queryOne('SELECT * FROM departments WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  if (!existing) return res.status(404).json({ error: 'Department not found' });
  await db.execute('DELETE FROM departments WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  res.json({ message: 'Department deleted' });
});
