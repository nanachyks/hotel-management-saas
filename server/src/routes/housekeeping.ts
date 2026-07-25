import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

export const housekeepingRouter = Router();
const db = getDb();

housekeepingRouter.get('/', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const { status, priority, room_id, assigned_to, from, to } = req.query;
  let query = `SELECT t.*, r.room_number, r.room_number || ' - ' || rt.name as room_info,
    e.first_name || ' ' || e.last_name as assigned_name
    FROM housekeeping_tasks t
    JOIN rooms r ON t.room_id = r.id
    JOIN room_types rt ON r.room_type_id = rt.id
    LEFT JOIN employees e ON t.assigned_to = e.id
    WHERE t.hotel_id = ?`;
  const params: string[] = [String(hotelId)];
  if (status) { query += ' AND t.status = ?'; params.push(status as string); }
  if (priority) { query += ' AND t.priority = ?'; params.push(priority as string); }
  if (room_id) { query += ' AND t.room_id = ?'; params.push(room_id as string); }
  if (assigned_to) { query += ' AND t.assigned_to = ?'; params.push(assigned_to as string); }
  if (from) { query += ' AND t.scheduled_date >= ?'; params.push(from as string); }
  if (to) { query += ' AND t.scheduled_date <= ?'; params.push(to as string); }
  query += ' ORDER BY t.created_at DESC';
  const tasks = await db.queryAll(query, params);
  res.json(tasks);
});

housekeepingRouter.post('/', async (req: AuthRequest, res: Response) => {
  const { room_id, assigned_to, priority, scheduled_date, notes } = req.body;
  if (!room_id) return res.status(400).json({ error: 'room_id is required' });
  const hotelId = req.user?.hotel_id;
  const room = await db.queryOne('SELECT id FROM rooms WHERE id = ? AND hotel_id = ?', [room_id, String(hotelId)]);
  if (!room) return res.status(400).json({ error: 'Room not found' });
  if (assigned_to) {
    const employee = await db.queryOne('SELECT id FROM employees WHERE id = ? AND hotel_id = ?', [assigned_to, String(hotelId)]);
    if (!employee) return res.status(400).json({ error: 'Employee not found' });
  }
  const id = uuid();
  await db.execute(
    'INSERT INTO housekeeping_tasks (id, hotel_id, room_id, assigned_to, priority, scheduled_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, String(hotelId), room_id, assigned_to || null, priority || 'medium', scheduled_date || null, notes || '']
  );
  const created = await db.queryOne(`SELECT t.*, r.room_number, e.first_name || ' ' || e.last_name as assigned_name
    FROM housekeeping_tasks t JOIN rooms r ON t.room_id = r.id LEFT JOIN employees e ON t.assigned_to = e.id WHERE t.id = ?`, [id]);
  await createNotification(String(hotelId), 'housekeeping', 'Housekeeping Task', `Room ${created.room_number} - ${created.assigned_name ? `assigned to ${created.assigned_name}` : priority} priority`, `/housekeeping`);
  res.status(201).json(created);
});

housekeepingRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const existing = await db.queryOne('SELECT * FROM housekeeping_tasks WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  const { room_id, assigned_to, priority, status, scheduled_date, notes } = req.body;
  if (room_id) {
    const room = await db.queryOne('SELECT id FROM rooms WHERE id = ? AND hotel_id = ?', [room_id, String(hotelId)]);
    if (!room) return res.status(400).json({ error: 'Room not found' });
  }
  if (assigned_to) {
    const employee = await db.queryOne('SELECT id FROM employees WHERE id = ? AND hotel_id = ?', [assigned_to, String(hotelId)]);
    if (!employee) return res.status(400).json({ error: 'Employee not found' });
  }
  await db.execute(
    'UPDATE housekeeping_tasks SET room_id = ?, assigned_to = ?, priority = ?, status = ?, scheduled_date = ?, notes = ? WHERE id = ? AND hotel_id = ?',
    [room_id ?? existing.room_id, assigned_to ?? existing.assigned_to, priority ?? existing.priority,
     status ?? existing.status, scheduled_date ?? existing.scheduled_date, notes ?? existing.notes,
     req.params.id, String(hotelId)]
  );
  const updated = await db.queryOne(`SELECT t.*, r.room_number, e.first_name || ' ' || e.last_name as assigned_name
    FROM housekeeping_tasks t JOIN rooms r ON t.room_id = r.id LEFT JOIN employees e ON t.assigned_to = e.id WHERE t.id = ?`, [req.params.id]);
  res.json(updated);
});

housekeepingRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const existing = await db.queryOne('SELECT * FROM housekeeping_tasks WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  await db.execute('DELETE FROM housekeeping_tasks WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  res.json({ message: 'Task deleted' });
});

housekeepingRouter.get('/inspections/:task_id', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const task = await db.queryOne('SELECT id FROM housekeeping_tasks WHERE id = ? AND hotel_id = ?', [req.params.task_id, String(hotelId)]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const inspection = await db.queryOne(`SELECT i.*, e.first_name || ' ' || e.last_name as inspector_name
    FROM housekeeping_inspections i
    LEFT JOIN employees e ON i.inspected_by = e.id
    WHERE i.task_id = ?`, [req.params.task_id]);
  res.json(inspection);
});

housekeepingRouter.post('/inspections', async (req: AuthRequest, res: Response) => {
  const { task_id, inspected_by, cleanliness, supplies_restocked, damage_found, notes } = req.body;
  if (!task_id) return res.status(400).json({ error: 'task_id is required' });
  const hotelId = req.user?.hotel_id;
  const task = await db.queryOne('SELECT id FROM housekeeping_tasks WHERE id = ? AND hotel_id = ?', [task_id, String(hotelId)]);
  if (!task) return res.status(400).json({ error: 'Task not found' });
  if (inspected_by) {
    const employee = await db.queryOne('SELECT id FROM employees WHERE id = ? AND hotel_id = ?', [inspected_by, String(hotelId)]);
    if (!employee) return res.status(400).json({ error: 'Employee not found' });
  }
  const id = uuid();
  await db.execute(
    'INSERT INTO housekeeping_inspections (id, task_id, inspected_by, cleanliness, supplies_restocked, damage_found, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, task_id, inspected_by || null, Number(cleanliness) || 5, !!supplies_restocked, damage_found || '', notes || '']
  );
  await db.execute('UPDATE housekeeping_tasks SET status = ? WHERE id = ?', ['inspected', task_id]);
  const created = await db.queryOne(`SELECT i.*, e.first_name || ' ' || e.last_name as inspector_name
    FROM housekeeping_inspections i LEFT JOIN employees e ON i.inspected_by = e.id WHERE i.id = ?`, [id]);
  res.status(201).json(created);
});
