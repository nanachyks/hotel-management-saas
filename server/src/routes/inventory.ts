import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export const inventoryRouter = Router();
const db = getDb();

inventoryRouter.get('/items', async (req: AuthRequest, res: Response) => {
  const { category, search, low_stock, page: pageStr, limit: limitStr } = req.query;
  const page = Math.max(1, parseInt(pageStr as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(limitStr as string) || 200));
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM inventory_items WHERE hotel_id = ?';
  let countQuery = 'SELECT COUNT(*) as total FROM inventory_items WHERE hotel_id = ?';
  const params: string[] = [req.user!.hotel_id];
  const countParams: string[] = [req.user!.hotel_id];

  if (category) { query += ' AND category = ?'; countQuery += ' AND category = ?'; params.push(category as string); countParams.push(category as string); }
  if (search) { query += ' AND name ILIKE ?'; countQuery += ' AND name ILIKE ?'; params.push(`%${search}%`); countParams.push(`%${search}%`); }
  if (low_stock === 'true') { query += ' AND min_stock > 0 AND quantity <= min_stock'; countQuery += ' AND min_stock > 0 AND quantity <= min_stock'; }

  query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
  params.push(String(limit), String(offset));

  const items = await db.queryAll(query, params);
  const { total } = (await db.queryOne(countQuery, countParams)) || { total: 0 };
  res.json({ data: items, total, page, limit });
});

inventoryRouter.get('/items/low-stock-count', async (req: AuthRequest, res: Response) => {
  const { count } = (await db.queryOne(
    'SELECT COUNT(*) as count FROM inventory_items WHERE hotel_id = ? AND min_stock > 0 AND quantity <= min_stock',
    [req.user!.hotel_id]
  )) || { count: 0 };
  res.json({ count });
});

inventoryRouter.get('/items/:id', async (req: AuthRequest, res: Response) => {
  const item = await db.queryOne('SELECT * FROM inventory_items WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

inventoryRouter.post('/items', async (req: AuthRequest, res: Response) => {
  const { name, category, quantity, unit, min_stock, cost_price, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const id = uuid();
  await db.execute(
    'INSERT INTO inventory_items (id, hotel_id, name, category, quantity, unit, min_stock, cost_price, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.user!.hotel_id, name, category || 'supplies', Number(quantity) || 0, unit || 'piece', Number(min_stock) || 0, Number(cost_price) || 0, notes || '']
  );
  const created = await db.queryOne('SELECT * FROM inventory_items WHERE id = ?', [id]);
  res.status(201).json(created);
});

inventoryRouter.put('/items/:id', async (req: AuthRequest, res: Response) => {
  const existing = await db.queryOne('SELECT * FROM inventory_items WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  const { name, category, quantity, unit, min_stock, cost_price, notes } = req.body;
  await db.execute(
    "UPDATE inventory_items SET name = ?, category = ?, quantity = ?, unit = ?, min_stock = ?, cost_price = ?, notes = ?, updated_at = NOW() WHERE id = ? AND hotel_id = ?",
    [name ?? existing.name, category ?? existing.category, quantity ?? existing.quantity, unit ?? existing.unit,
     min_stock ?? existing.min_stock, cost_price ?? existing.cost_price, notes ?? existing.notes, req.params.id, req.user!.hotel_id]
  );
  const updated = await db.queryOne('SELECT * FROM inventory_items WHERE id = ?', [req.params.id]);
  res.json(updated);
});

inventoryRouter.delete('/items/:id', async (req: AuthRequest, res: Response) => {
  const existing = await db.queryOne('SELECT * FROM inventory_items WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Item not found' });
  await db.execute('DELETE FROM inventory_items WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  await db.execute('DELETE FROM inventory_transactions WHERE item_id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  res.json({ message: 'Item deleted' });
});

inventoryRouter.get('/items/:id/transactions', async (req: AuthRequest, res: Response) => {
  const { page: pageStr, limit: limitStr } = req.query;
  const page = Math.max(1, parseInt(pageStr as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(limitStr as string) || 200));
  const offset = (page - 1) * limit;

  const item = await db.queryOne('SELECT * FROM inventory_items WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const txns = await db.queryAll(
    'SELECT * FROM inventory_transactions WHERE item_id = ? AND hotel_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [req.params.id, req.user!.hotel_id, String(limit), String(offset)]
  );
  const { total } = (await db.queryOne('SELECT COUNT(*) as total FROM inventory_transactions WHERE item_id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id])) || { total: 0 };
  res.json({ data: txns, total, page, limit });
});

inventoryRouter.post('/items/:id/transactions', async (req: AuthRequest, res: Response) => {
  const { type, quantity, reference, notes } = req.body;
  if (!type || !quantity) return res.status(400).json({ error: 'type and quantity are required' });
  if (!['in', 'out', 'adjustment'].includes(type)) return res.status(400).json({ error: 'type must be in, out, or adjustment' });

  const item = await db.queryOne('SELECT * FROM inventory_items WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const txnId = uuid();
  const qty = Number(quantity);
  await db.execute(
    'INSERT INTO inventory_transactions (id, hotel_id, item_id, type, quantity, reference, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [txnId, req.user!.hotel_id, req.params.id, type, qty, reference || '', notes || '']
  );

  const newQty = type === 'in' ? item.quantity + qty : type === 'out' ? Math.max(0, item.quantity - qty) : qty;
  await db.execute(
    "UPDATE inventory_items SET quantity = ?, updated_at = NOW() WHERE id = ? AND hotel_id = ?",
    [newQty, req.params.id, req.user!.hotel_id]
  );

  const created = await db.queryOne('SELECT * FROM inventory_transactions WHERE id = ?', [txnId]);
  res.status(201).json({ transaction: created, new_quantity: newQty });
});
