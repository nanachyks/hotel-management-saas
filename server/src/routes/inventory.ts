import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export const inventoryRouter = Router();
const db = getDb();

inventoryRouter.get('/items', (req: AuthRequest, res: Response) => {
  const { category, search, low_stock, page: pageStr, limit: limitStr } = req.query;
  const page = Math.max(1, parseInt(pageStr as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(limitStr as string) || 200));
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM inventory_items WHERE hotel_id = ?';
  let countQuery = 'SELECT COUNT(*) as total FROM inventory_items WHERE hotel_id = ?';
  const params: string[] = [req.user!.hotel_id];
  const countParams: string[] = [req.user!.hotel_id];

  if (category) { query += ' AND category = ?'; countQuery += ' AND category = ?'; params.push(category as string); countParams.push(category as string); }
  if (search) { query += ' AND name LIKE ?'; countQuery += ' AND name LIKE ?'; params.push(`%${search}%`); countParams.push(`%${search}%`); }
  if (low_stock === 'true') { query += ' AND min_stock > 0 AND quantity <= min_stock'; countQuery += ' AND min_stock > 0 AND quantity <= min_stock'; }

  query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
  params.push(String(limit), String(offset));

  const items = db.queryAll(query, params);
  const { total } = db.queryOne(countQuery, countParams) || { total: 0 };
  res.json({ data: items, total, page, limit });
});

inventoryRouter.get('/items/low-stock-count', (req: AuthRequest, res: Response) => {
  const { count } = db.queryOne(
    'SELECT COUNT(*) as count FROM inventory_items WHERE hotel_id = ? AND min_stock > 0 AND quantity <= min_stock',
    [req.user!.hotel_id]
  ) || { count: 0 };
  res.json({ count });
});

inventoryRouter.get('/items/:id', (req: AuthRequest, res: Response) => {
  const item = db.queryOne('SELECT * FROM inventory_items WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

inventoryRouter.post('/items', (req: AuthRequest, res: Response) => {
  const { name, category, quantity, unit, min_stock, cost_price, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const id = uuid();
  db.execute(
    'INSERT INTO inventory_items (id, hotel_id, name, category, quantity, unit, min_stock, cost_price, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.user!.hotel_id, name, category || 'supplies', Number(quantity) || 0, unit || 'piece', Number(min_stock) || 0, Number(cost_price) || 0, notes || '']
  );
  const created = db.queryOne('SELECT * FROM inventory_items WHERE id = ?', [id]);
  res.status(201).json(created);
});

inventoryRouter.put('/items/:id', (req: AuthRequest, res: Response) => {
  const existing = db.queryOne('SELECT * FROM inventory_items WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  const { name, category, quantity, unit, min_stock, cost_price, notes } = req.body;
  db.execute(
    "UPDATE inventory_items SET name = ?, category = ?, quantity = ?, unit = ?, min_stock = ?, cost_price = ?, notes = ?, updated_at = datetime('now') WHERE id = ? AND hotel_id = ?",
    [name ?? existing.name, category ?? existing.category, quantity ?? existing.quantity, unit ?? existing.unit,
     min_stock ?? existing.min_stock, cost_price ?? existing.cost_price, notes ?? existing.notes, req.params.id, req.user!.hotel_id]
  );
  const updated = db.queryOne('SELECT * FROM inventory_items WHERE id = ?', [req.params.id]);
  res.json(updated);
});

inventoryRouter.delete('/items/:id', (req: AuthRequest, res: Response) => {
  const existing = db.queryOne('SELECT * FROM inventory_items WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Item not found' });
  db.execute('DELETE FROM inventory_items WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  db.execute('DELETE FROM inventory_transactions WHERE item_id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  res.json({ message: 'Item deleted' });
});

inventoryRouter.get('/items/:id/transactions', (req: AuthRequest, res: Response) => {
  const { page: pageStr, limit: limitStr } = req.query;
  const page = Math.max(1, parseInt(pageStr as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(limitStr as string) || 200));
  const offset = (page - 1) * limit;

  const item = db.queryOne('SELECT * FROM inventory_items WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const txns = db.queryAll(
    'SELECT * FROM inventory_transactions WHERE item_id = ? AND hotel_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [req.params.id, req.user!.hotel_id, String(limit), String(offset)]
  );
  const { total } = db.queryOne('SELECT COUNT(*) as total FROM inventory_transactions WHERE item_id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]) || { total: 0 };
  res.json({ data: txns, total, page, limit });
});

inventoryRouter.post('/items/:id/transactions', (req: AuthRequest, res: Response) => {
  const { type, quantity, reference, notes } = req.body;
  if (!type || !quantity) return res.status(400).json({ error: 'type and quantity are required' });
  if (!['in', 'out', 'adjustment'].includes(type)) return res.status(400).json({ error: 'type must be in, out, or adjustment' });

  const item = db.queryOne('SELECT * FROM inventory_items WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const txnId = uuid();
  const qty = Number(quantity);
  db.execute(
    'INSERT INTO inventory_transactions (id, hotel_id, item_id, type, quantity, reference, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [txnId, req.user!.hotel_id, req.params.id, type, qty, reference || '', notes || '']
  );

  const newQty = type === 'in' ? item.quantity + qty : type === 'out' ? Math.max(0, item.quantity - qty) : qty;
  db.execute(
    "UPDATE inventory_items SET quantity = ?, updated_at = datetime('now') WHERE id = ? AND hotel_id = ?",
    [newQty, req.params.id, req.user!.hotel_id]
  );

  const created = db.queryOne('SELECT * FROM inventory_transactions WHERE id = ?', [txnId]);
  res.status(201).json({ transaction: created, new_quantity: newQty });
});
