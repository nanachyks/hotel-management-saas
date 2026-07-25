import { Router, Response, NextFunction } from 'express';
import { getDb } from '../db.js';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
const db = getDb();

const router = Router();

const createHotelSchema = z.object({
  name: z.string().min(1, 'Hotel name is required'),
  address: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().email().optional().or(z.literal('')).default(''),
  currency: z.string().length(3).optional().default('GHS'),
  timezone: z.string().optional().default('Africa/Accra'),
});

const updateHotelSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  currency: z.string().length(3).optional(),
  timezone: z.string().optional(),
  logo_url: z.string().optional(),
  status: z.enum(['active', 'inactive', 'maintenance']).optional(),
});

const addTeamMemberSchema = z.object({
  email: z.string().email('Valid email required'),
  role: z.string().optional().default('staff'),
});

// ── Multi-Property Management ──

// Create a new hotel (property)
router.post('/hotels', validate(createHotelSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, address, phone, email, currency, timezone } = req.body;
    const id = uuid();
    const domain = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await db.execute('INSERT INTO hotels (id, name, slug, address, phone, email, currency, timezone) VALUES (?,?,?,?,?,?,?,?)',
      [id, name, `${domain}-${id.slice(0, 6)}`, address || '', phone || '', email || '', currency || 'GHS', timezone || 'Africa/Accra']);
    // Add creator as owner
    await db.execute('INSERT INTO hotel_members (id, hotel_id, user_id, role) VALUES (?,?,?,?)',
      [uuid(), id, req.user!.id, 'owner']);
    res.json({ id, name });
  } catch (e: any) { next(e); }
});

// Update hotel
router.put('/hotels/:id', validate(updateHotelSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Owner via an explicit multi-property membership, or this is the caller's
    // own home hotel (users created outside the Enterprise flow have no
    // hotel_members row for their primary hotel — see hotels.ts GET /mine).
    const isHomeHotelOwner = req.params.id === req.user!.hotel_id && (req.user!.role === 'owner' || req.user!.role === 'admin');
    const membership = await db.queryOne(
      "SELECT id FROM hotel_members WHERE hotel_id=? AND user_id=? AND role='owner'",
      [req.params.id, req.user!.id]
    );
    if (!isHomeHotelOwner && !membership) return res.status(403).json({ error: 'Only a hotel owner can update this property' });
    const existing = await db.queryOne('SELECT * FROM hotels WHERE id=?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Hotel not found' });
    const { name, address, phone, email, currency, timezone, logo_url, status } = req.body;
    await db.execute('UPDATE hotels SET name=?, address=?, phone=?, email=?, currency=?, timezone=?, logo_url=?, status=? WHERE id=?',
      [name ?? existing.name, address ?? existing.address, phone ?? existing.phone, email ?? existing.email,
       currency ?? existing.currency, timezone ?? existing.timezone, logo_url ?? existing.logo_url, status ?? existing.status, req.params.id]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// List all hotels user has access to (for property switcher)
router.get('/hotels', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const hotels = await db.queryAll(`
      SELECT h.*, hm.role as membership_role
      FROM hotel_members hm
      JOIN hotels h ON h.id=hm.hotel_id
      WHERE hm.user_id=?
      ORDER BY h.name
    `, [req.user!.id]);
    res.json(hotels);
  } catch (e: any) { next(e); }
});

// Team members for current hotel
router.get('/team', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const members = await db.queryAll(`
      SELECT u.id, u.username, u.email, u.role, u.role_id,
             hm.role as membership_role
      FROM hotel_members hm
      JOIN users u ON u.id=hm.user_id
      WHERE hm.hotel_id=?
    `, [req.user!.hotel_id]);
    res.json(members);
  } catch (e: any) { next(e); }
});

// Add team member
router.post('/team', validate(addTeamMemberSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, role } = req.body;
    const user = await db.queryAll('SELECT id FROM users WHERE email=?', [email]);
    if (!user.length) return res.status(404).json({ error: 'User not found' });
    const existing = await db.queryAll('SELECT id FROM hotel_members WHERE hotel_id=? AND user_id=?', [req.user!.hotel_id, user[0].id]);
    if (existing.length) return res.status(400).json({ error: 'User already a member' });
    await db.execute('INSERT INTO hotel_members (id, hotel_id, user_id, role) VALUES (?,?,?,?)',
      [uuid(), req.user!.hotel_id, user[0].id, role || 'staff']);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// Remove team member
router.delete('/team/:userId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await db.execute('DELETE FROM hotel_members WHERE hotel_id=? AND user_id=?', [req.user!.hotel_id, req.params.userId]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

export default router;
