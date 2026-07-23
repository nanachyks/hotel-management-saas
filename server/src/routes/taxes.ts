import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest, authenticate } from '../middleware/auth.js';

export const taxesRouter = Router();
const db = getDb();

taxesRouter.use(authenticate);

taxesRouter.get('/', (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const taxes = db.queryAll(
    'SELECT * FROM hotel_taxes WHERE hotel_id = ? ORDER BY is_mandatory DESC, name ASC',
    [String(hotelId)]
  );
  res.json(taxes);
});

taxesRouter.post('/', (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const { name, rate, type, is_mandatory } = req.body;
  if (!name || rate === undefined) {
    res.status(400).json({ error: 'name and rate are required' });
    return;
  }
  const id = uuid();
  db.execute(
    'INSERT INTO hotel_taxes (id, hotel_id, name, rate, type, is_mandatory) VALUES (?, ?, ?, ?, ?, ?)',
    [id, String(hotelId), name, Number(rate), type || 'percentage', is_mandatory !== undefined ? (is_mandatory ? 1 : 0) : 1]
  );
  res.status(201).json({ id, name, rate, type, is_mandatory });
});

taxesRouter.put('/:id', (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const { name, rate, type, is_mandatory } = req.body;
  db.execute(
    'UPDATE hotel_taxes SET name = ?, rate = ?, type = ?, is_mandatory = ? WHERE id = ? AND hotel_id = ?',
    [name, Number(rate), type || 'percentage', is_mandatory ? 1 : 0, req.params.id, String(hotelId)]
  );
  res.json({ success: true });
});

taxesRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  db.execute('DELETE FROM hotel_taxes WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  res.json({ success: true });
});

export function getHotelTaxes(hotelId: string): any[] {
  return db.queryAll(
    'SELECT * FROM hotel_taxes WHERE hotel_id = ? ORDER BY is_mandatory DESC, name ASC',
    [hotelId]
  );
}
