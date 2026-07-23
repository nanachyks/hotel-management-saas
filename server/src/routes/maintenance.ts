import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

export const maintenanceRouter = Router();
const db = getDb();

maintenanceRouter.get('/', (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const { status, priority, room_id, assigned_to } = req.query;
  let query = `SELECT m.*, r.room_number, r.room_number || ' - ' || rt.name as room_info,
    rep.first_name || ' ' || rep.last_name as reported_by_name,
    ass.first_name || ' ' || ass.last_name as assigned_name
    FROM maintenance_requests m
    LEFT JOIN rooms r ON m.room_id = r.id
    LEFT JOIN room_types rt ON r.room_type_id = rt.id
    LEFT JOIN employees rep ON m.reported_by = rep.id
    LEFT JOIN employees ass ON m.assigned_to = ass.id
    WHERE m.hotel_id = ?`;
  const params: string[] = [String(hotelId)];
  if (status) { query += ' AND m.status = ?'; params.push(status as string); }
  if (priority) { query += ' AND m.priority = ?'; params.push(priority as string); }
  if (room_id) { query += ' AND m.room_id = ?'; params.push(room_id as string); }
  if (assigned_to) { query += ' AND m.assigned_to = ?'; params.push(assigned_to as string); }
  query += ' ORDER BY m.created_at DESC';
  const requests = db.queryAll(query, params);
  res.json(requests);
});

maintenanceRouter.post('/', (req: AuthRequest, res: Response) => {
  const { room_id, reported_by, title, description, priority, assigned_to, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const hotelId = req.user?.hotel_id;
  const id = uuid();
  db.execute(
    'INSERT INTO maintenance_requests (id, hotel_id, room_id, reported_by, title, description, priority, assigned_to, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, String(hotelId), room_id || null, reported_by || null, title, description || '', priority || 'medium', assigned_to || null, notes || '']
  );
  const created = db.queryOne(`SELECT m.*, r.room_number FROM maintenance_requests m LEFT JOIN rooms r ON m.room_id = r.id WHERE m.id = ?`, [id]);
  if (priority === 'urgent' || priority === 'high') {
    createNotification(String(hotelId), 'maintenance', `${priority === 'urgent' ? 'Urgent' : 'High'} Maintenance`, `${title} - ${created.room_number ? `Room ${created.room_number}` : 'Common area'}`, `/maintenance`);
  }
  res.status(201).json(created);
});

maintenanceRouter.put('/:id', (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const existing = db.queryOne('SELECT * FROM maintenance_requests WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  if (!existing) return res.status(404).json({ error: 'Maintenance request not found' });
  const { room_id, title, description, priority, status, assigned_to, notes } = req.body;
  db.execute(
    'UPDATE maintenance_requests SET room_id = ?, title = ?, description = ?, priority = ?, status = ?, assigned_to = ?, notes = ? WHERE id = ? AND hotel_id = ?',
    [room_id ?? existing.room_id, title ?? existing.title, description ?? existing.description,
     priority ?? existing.priority, status ?? existing.status, assigned_to ?? existing.assigned_to,
     notes ?? existing.notes, req.params.id, String(hotelId)]
  );
  const updated = db.queryOne(`SELECT m.*, r.room_number FROM maintenance_requests m LEFT JOIN rooms r ON m.room_id = r.id WHERE m.id = ?`, [req.params.id]);
  res.json(updated);
});

maintenanceRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const existing = db.queryOne('SELECT * FROM maintenance_requests WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  if (!existing) return res.status(404).json({ error: 'Maintenance request not found' });
  db.execute('DELETE FROM maintenance_requests WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  res.json({ message: 'Maintenance request deleted' });
});
