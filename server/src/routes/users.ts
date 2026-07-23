import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

export const usersRouter = Router();
const db = getDb();

usersRouter.use(authenticate, requireRole('admin', 'owner'));

usersRouter.get('/', (req: AuthRequest, res: Response) => {
  const { page: pageStr, limit: limitStr } = req.query;
  const hasPagination = pageStr !== undefined;
  const page = Math.max(1, parseInt(pageStr as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(limitStr as string) || 200));
  const offset = (page - 1) * limit;

  const hotelId = req.user?.hotel_id;
  const users = db.queryAll(
    'SELECT id, username, email, name, role, created_at FROM users WHERE hotel_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [String(hotelId), String(limit), String(offset)]
  );
  const { total } = db.queryOne('SELECT COUNT(*) as total FROM users WHERE hotel_id = ?', [String(hotelId)]) || { total: 0 };

  if (hasPagination) {
    res.json({ data: users, total, page, limit });
  } else {
    res.json(users);
  }
});

usersRouter.post('/', (req: AuthRequest, res: Response) => {
  const { username, password, name, email, role } = req.body;
  if (!username || !password || !name || !email) {
    return res.status(400).json({ error: 'username, password, name, and email are required' });
  }

  const hotelId = req.user?.hotel_id;
  const existing = db.queryOne('SELECT id FROM users WHERE username = ? AND hotel_id = ?', [username, String(hotelId)]);
  if (existing) return res.status(409).json({ error: 'Username already taken' });

  const existingEmail = db.queryOne('SELECT id FROM users WHERE email = ? AND hotel_id = ?', [email, String(hotelId)]);
  if (existingEmail) return res.status(409).json({ error: 'Email already registered' });

  const id = uuid();
  const password_hash = bcrypt.hashSync(password, 10);
  db.execute(
    'INSERT INTO users (id, username, email, password_hash, name, role, hotel_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, username, email, password_hash, name, role || 'receptionist', String(hotelId)]
  );

  const created = db.queryOne('SELECT id, username, email, name, role, created_at FROM users WHERE id = ? AND hotel_id = ?', [id, String(hotelId)]);
  res.status(201).json(created);
});

usersRouter.put('/:id', (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const existing = db.queryOne('SELECT * FROM users WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]) as any;
  if (!existing) return res.status(404).json({ error: 'User not found' });

  const { username, password, name, email, role } = req.body;

  if (username && username !== existing.username) {
    const taken = db.queryOne('SELECT id FROM users WHERE username = ? AND hotel_id = ?', [username, String(hotelId)]);
    if (taken) return res.status(409).json({ error: 'Username already taken' });
  }

  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.execute(
      'UPDATE users SET username = ?, email = ?, name = ?, role = ?, password_hash = ? WHERE id = ? AND hotel_id = ?',
      [username ?? existing.username, email ?? existing.email, name ?? existing.name, role ?? existing.role, hash, req.params.id, String(hotelId)]
    );
  } else {
    db.execute(
      'UPDATE users SET username = ?, email = ?, name = ?, role = ? WHERE id = ? AND hotel_id = ?',
      [username ?? existing.username, email ?? existing.email, name ?? existing.name, role ?? existing.role, req.params.id, String(hotelId)]
    );
  }

  const updated = db.queryOne('SELECT id, username, email, name, role, created_at FROM users WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  res.json(updated);
});

usersRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  if (req.params.id === req.user?.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  const hotelId = req.user?.hotel_id;
  const existing = db.queryOne('SELECT id FROM users WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  db.execute('DELETE FROM users WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  res.json({ message: 'User deleted' });
});
