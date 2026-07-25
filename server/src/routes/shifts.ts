import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export const shiftsRouter = Router();
const db = getDb();

shiftsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const { employee_id, from, to, date } = req.query;
  let query = `SELECT s.*, e.first_name || ' ' || e.last_name as employee_name, e.position as employee_position
    FROM shifts s JOIN employees e ON s.employee_id = e.id WHERE s.hotel_id = ?`;
  const params: string[] = [String(hotelId)];
  if (employee_id) { query += ' AND s.employee_id = ?'; params.push(employee_id as string); }
  if (from) { query += ' AND s.date >= ?'; params.push(from as string); }
  if (to) { query += ' AND s.date <= ?'; params.push(to as string); }
  if (date) { query += ' AND s.date = ?'; params.push(date as string); }
  query += ' ORDER BY s.date DESC, s.start_time';
  const shifts = await db.queryAll(query, params);
  res.json(shifts);
});

shiftsRouter.post('/', async (req: AuthRequest, res: Response) => {
  const { employee_id, date, start_time, end_time, notes } = req.body;
  if (!employee_id || !date || !start_time || !end_time) return res.status(400).json({ error: 'employee_id, date, start_time, end_time are required' });
  const hotelId = req.user?.hotel_id;
  const employee = await db.queryOne('SELECT id FROM employees WHERE id = ? AND hotel_id = ?', [employee_id, String(hotelId)]);
  if (!employee) return res.status(400).json({ error: 'Employee not found' });
  const id = uuid();
  await db.execute('INSERT INTO shifts (id, hotel_id, employee_id, date, start_time, end_time, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, String(hotelId), employee_id, date, start_time, end_time, notes || '']);
  const created = await db.queryOne(`SELECT s.*, e.first_name || ' ' || e.last_name as employee_name FROM shifts s JOIN employees e ON s.employee_id = e.id WHERE s.id = ?`, [id]);
  res.status(201).json(created);
});

shiftsRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const existing = await db.queryOne('SELECT * FROM shifts WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  if (!existing) return res.status(404).json({ error: 'Shift not found' });
  const { employee_id, date, start_time, end_time, notes } = req.body;
  if (employee_id) {
    const employee = await db.queryOne('SELECT id FROM employees WHERE id = ? AND hotel_id = ?', [employee_id, String(hotelId)]);
    if (!employee) return res.status(400).json({ error: 'Employee not found' });
  }
  await db.execute('UPDATE shifts SET employee_id = ?, date = ?, start_time = ?, end_time = ?, notes = ? WHERE id = ? AND hotel_id = ?',
    [employee_id ?? existing.employee_id, date ?? existing.date, start_time ?? existing.start_time,
     end_time ?? existing.end_time, notes ?? existing.notes, req.params.id, String(hotelId)]);
  const updated = await db.queryOne(`SELECT s.*, e.first_name || ' ' || e.last_name as employee_name FROM shifts s JOIN employees e ON s.employee_id = e.id WHERE s.id = ?`, [req.params.id]);
  res.json(updated);
});

shiftsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const existing = await db.queryOne('SELECT * FROM shifts WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  if (!existing) return res.status(404).json({ error: 'Shift not found' });
  await db.execute('DELETE FROM shifts WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  res.json({ message: 'Shift deleted' });
});
