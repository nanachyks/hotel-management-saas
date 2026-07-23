import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export const expensesRouter = Router();
const db = getDb();

expensesRouter.get('/', (req: AuthRequest, res: Response) => {
  const { category, from, to, page: pageStr, limit: limitStr } = req.query;
  const page = Math.max(1, parseInt(pageStr as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(limitStr as string) || 200));
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM expenses WHERE hotel_id = ?';
  let countQuery = 'SELECT COUNT(*) as total FROM expenses WHERE hotel_id = ?';
  const params: string[] = [req.user!.hotel_id];
  const countParams: string[] = [req.user!.hotel_id];

  if (category) { query += ' AND category = ?'; countQuery += ' AND category = ?'; params.push(category as string); countParams.push(category as string); }
  if (from) { query += ' AND date >= ?'; countQuery += ' AND date >= ?'; params.push(from as string); countParams.push(from as string); }
  if (to) { query += ' AND date <= ?'; countQuery += ' AND date <= ?'; params.push(to as string); countParams.push(to as string); }

  query += ' ORDER BY date DESC LIMIT ? OFFSET ?';
  params.push(String(limit), String(offset));

  const expenses = db.queryAll(query, params);
  const { total } = db.queryOne(countQuery, countParams) || { total: 0 };
  res.json({ data: expenses, total, page, limit });
});

expensesRouter.post('/', (req: AuthRequest, res: Response) => {
  const { category, description, amount, date, notes } = req.body;
  if (!description || !amount) return res.status(400).json({ error: 'description and amount are required' });

  const id = uuid();
  db.execute(
    'INSERT INTO expenses (id, hotel_id, category, description, amount, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, req.user!.hotel_id, category || 'other', description, Number(amount), date || new Date().toISOString().split('T')[0], notes || '']
  );
  const created = db.queryOne('SELECT * FROM expenses WHERE id = ?', [id]);
  res.status(201).json(created);
});

expensesRouter.put('/:id', (req: AuthRequest, res: Response) => {
  const existing = db.queryOne('SELECT * FROM expenses WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Expense not found' });

  const { category, description, amount, date, notes } = req.body;
  db.execute(
    'UPDATE expenses SET category = ?, description = ?, amount = ?, date = ?, notes = ? WHERE id = ? AND hotel_id = ?',
    [category ?? existing.category, description ?? existing.description, amount ?? existing.amount, date ?? existing.date, notes ?? existing.notes, req.params.id, req.user!.hotel_id]
  );
  const updated = db.queryOne('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
  res.json(updated);
});

expensesRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  const existing = db.queryOne('SELECT * FROM expenses WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Expense not found' });
  db.execute('DELETE FROM expenses WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  res.json({ message: 'Expense deleted' });
});
