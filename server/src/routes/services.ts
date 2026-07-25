import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export const servicesRouter = Router();
const db = getDb();

servicesRouter.get('/', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const services = await db.queryAll('SELECT * FROM services WHERE hotel_id = ? ORDER BY category, name', [String(hotelId)]);
  res.json(services);
});

servicesRouter.post('/', async (req: AuthRequest, res: Response) => {
  const { name, description, price, category } = req.body;
  if (!name || !price) {
    return res.status(400).json({ error: 'name and price are required' });
  }
  const hotelId = req.user?.hotel_id;
  const id = uuid();
  await db.execute(
    'INSERT INTO services (id, name, description, price, category, hotel_id) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, description || '', Number(price), category || 'general', String(hotelId)]
  );
  const created = await db.queryOne('SELECT * FROM services WHERE id = ? AND hotel_id = ?', [id, String(hotelId)]);
  res.status(201).json(created);
});

servicesRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const existing = await db.queryOne('SELECT * FROM services WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  if (!existing) return res.status(404).json({ error: 'Service not found' });

  const { name, description, price, category } = req.body;
  await db.execute(
    'UPDATE services SET name = ?, description = ?, price = ?, category = ? WHERE id = ? AND hotel_id = ?',
    [name ?? existing.name, description ?? existing.description, price ?? existing.price, category ?? existing.category, req.params.id, String(hotelId)]
  );
  const updated = await db.queryOne('SELECT * FROM services WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  res.json(updated);
});

servicesRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const existing = await db.queryOne('SELECT * FROM services WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  if (!existing) return res.status(404).json({ error: 'Service not found' });
  await db.execute('DELETE FROM services WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  res.json({ message: 'Service deleted' });
});
