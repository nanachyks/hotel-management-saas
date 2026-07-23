import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../db.js';
import { v4 as uuid } from 'uuid';
const db = getDb();

const router = Router();

// ── Multi-Property Management ──

// Create a new hotel (property)
router.post('/hotels', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, address, phone, email, currency, timezone } = req.body;
    const id = uuid();
    const domain = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    db.execute('INSERT INTO hotels (id, name, slug, address, phone, email, currency, timezone) VALUES (?,?,?,?,?,?,?,?)',
      [id, name, `${domain}-${id.slice(0, 6)}`, address || '', phone || '', email || '', currency || 'GHS', timezone || 'Africa/Accra']);
    // Add creator as owner
    db.execute('INSERT INTO hotel_members (id, hotel_id, user_id, role) VALUES (?,?,?,?)',
      [uuid(), id, (req as any).userId, 'owner']);
    res.json({ id, name });
  } catch (e: any) { next(e); }
});

// Update hotel
router.put('/hotels/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, address, phone, email, currency, timezone, logo_url, status } = req.body;
    db.execute('UPDATE hotels SET name=?, address=?, phone=?, email=?, currency=?, timezone=?, logo_url=?, status=? WHERE id=?',
      [name, address, phone, email, currency, timezone, logo_url, status, req.params.id]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// List all hotels user has access to (for property switcher)
router.get('/hotels', (req: Request, res: Response, next: NextFunction) => {
  try {
    const hotels = db.queryAll(`
      SELECT h.*, hm.role as membership_role
      FROM hotel_members hm
      JOIN hotels h ON h.id=hm.hotel_id
      WHERE hm.user_id=?
      ORDER BY h.name
    `, [(req as any).userId]);
    res.json(hotels);
  } catch (e: any) { next(e); }
});

// Team members for current hotel
router.get('/team', (req: Request, res: Response, next: NextFunction) => {
  try {
    const members = db.queryAll(`
      SELECT u.id, u.username, u.email, u.role, u.role_id,
             hm.role as membership_role
      FROM hotel_members hm
      JOIN users u ON u.id=hm.user_id
      WHERE hm.hotel_id=?
    `, [req.hotelId]);
    res.json(members);
  } catch (e: any) { next(e); }
});

// Add team member
router.post('/team', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, role } = req.body;
    const user = db.queryAll('SELECT id FROM users WHERE email=?', [email]);
    if (!user.length) return res.status(404).json({ error: 'User not found' });
    const existing = db.queryAll('SELECT id FROM hotel_members WHERE hotel_id=? AND user_id=?', [req.hotelId, user[0].id]);
    if (existing.length) return res.status(400).json({ error: 'User already a member' });
    db.execute('INSERT INTO hotel_members (id, hotel_id, user_id, role) VALUES (?,?,?,?)',
      [uuid(), req.hotelId, user[0].id, role || 'staff']);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// Remove team member
router.delete('/team/:userId', (req: Request, res: Response, next: NextFunction) => {
  try {
    db.execute('DELETE FROM hotel_members WHERE hotel_id=? AND user_id=?', [req.hotelId, req.params.userId]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

export default router;
