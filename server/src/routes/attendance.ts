import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export const attendanceRouter = Router();
const db = getDb();

attendanceRouter.get('/', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const { employee_id, from, to, date, status } = req.query;
  let query = `SELECT a.*, e.first_name || ' ' || e.last_name as employee_name
    FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.hotel_id = ?`;
  const params: string[] = [String(hotelId)];
  if (employee_id) { query += ' AND a.employee_id = ?'; params.push(employee_id as string); }
  if (from) { query += ' AND a.date >= ?'; params.push(from as string); }
  if (to) { query += ' AND a.date <= ?'; params.push(to as string); }
  if (date) { query += ' AND a.date = ?'; params.push(date as string); }
  if (status) { query += ' AND a.status = ?'; params.push(status as string); }
  query += ' ORDER BY a.date DESC, a.created_at';
  const attendance = await db.queryAll(query, params);
  res.json(attendance);
});

attendanceRouter.post('/', async (req: AuthRequest, res: Response) => {
  const { employee_id, date, check_in, check_out, status, notes } = req.body;
  if (!employee_id || !date) return res.status(400).json({ error: 'employee_id and date are required' });
  const hotelId = req.user?.hotel_id;
  const employee = await db.queryOne('SELECT id FROM employees WHERE id = ? AND hotel_id = ?', [employee_id, String(hotelId)]);
  if (!employee) return res.status(400).json({ error: 'Employee not found' });
  const id = uuid();
  await db.execute('INSERT INTO attendance (id, hotel_id, employee_id, date, check_in, check_out, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, String(hotelId), employee_id, date, check_in || null, check_out || null, status || 'present', notes || '']);
  const created = await db.queryOne(`SELECT a.*, e.first_name || ' ' || e.last_name as employee_name FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.id = ?`, [id]);
  res.status(201).json(created);
});

attendanceRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const existing = await db.queryOne('SELECT * FROM attendance WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  if (!existing) return res.status(404).json({ error: 'Attendance record not found' });
  const { check_in, check_out, status, notes } = req.body;
  await db.execute('UPDATE attendance SET check_in = ?, check_out = ?, status = ?, notes = ? WHERE id = ? AND hotel_id = ?',
    [check_in ?? existing.check_in, check_out ?? existing.check_out, status ?? existing.status, notes ?? existing.notes,
     req.params.id, String(hotelId)]);
  const updated = await db.queryOne(`SELECT a.*, e.first_name || ' ' || e.last_name as employee_name FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE a.id = ?`, [req.params.id]);
  res.json(updated);
});

attendanceRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const existing = await db.queryOne('SELECT * FROM attendance WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  if (!existing) return res.status(404).json({ error: 'Attendance record not found' });
  await db.execute('DELETE FROM attendance WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  res.json({ message: 'Attendance deleted' });
});
