import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export const employeesRouter = Router();
const db = getDb();

employeesRouter.get('/', (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const { department_id, status } = req.query;
  let query = 'SELECT e.*, d.name as department_name FROM employees e LEFT JOIN departments d ON e.department_id = d.id WHERE e.hotel_id = ?';
  const params: string[] = [String(hotelId)];
  if (department_id) { query += ' AND e.department_id = ?'; params.push(department_id as string); }
  if (status) { query += ' AND e.status = ?'; params.push(status as string); }
  query += ' ORDER BY e.first_name, e.last_name';
  const employees = db.queryAll(query, params);
  res.json(employees);
});

employeesRouter.post('/', (req: AuthRequest, res: Response) => {
  const { department_id, first_name, last_name, email, phone, position, hourly_rate } = req.body;
  if (!first_name || !last_name) return res.status(400).json({ error: 'first_name and last_name are required' });
  const hotelId = req.user?.hotel_id;
  const id = uuid();
  db.execute(
    'INSERT INTO employees (id, hotel_id, department_id, first_name, last_name, email, phone, position, hourly_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, String(hotelId), department_id || null, first_name, last_name, email || '', phone || '', position || '', Number(hourly_rate) || 0]
  );
  const created = db.queryOne('SELECT e.*, d.name as department_name FROM employees e LEFT JOIN departments d ON e.department_id = d.id WHERE e.id = ?', [id]);
  res.status(201).json(created);
});

employeesRouter.put('/:id', (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const existing = db.queryOne('SELECT * FROM employees WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  if (!existing) return res.status(404).json({ error: 'Employee not found' });
  const { department_id, first_name, last_name, email, phone, position, hourly_rate, status } = req.body;
  db.execute(
    'UPDATE employees SET department_id = ?, first_name = ?, last_name = ?, email = ?, phone = ?, position = ?, hourly_rate = ?, status = ? WHERE id = ? AND hotel_id = ?',
    [department_id ?? existing.department_id, first_name ?? existing.first_name, last_name ?? existing.last_name,
     email ?? existing.email, phone ?? existing.phone, position ?? existing.position,
     Number(hourly_rate) ?? existing.hourly_rate, status ?? existing.status, req.params.id, String(hotelId)]
  );
  const updated = db.queryOne('SELECT e.*, d.name as department_name FROM employees e LEFT JOIN departments d ON e.department_id = d.id WHERE e.id = ?', [req.params.id]);
  res.json(updated);
});

employeesRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const existing = db.queryOne('SELECT * FROM employees WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  if (!existing) return res.status(404).json({ error: 'Employee not found' });
  db.execute('DELETE FROM employees WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  res.json({ message: 'Employee deleted' });
});
