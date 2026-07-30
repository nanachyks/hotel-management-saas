import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { getDb } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { sendEmailVerification } from '../services/email.js';
import { getPlanLimits } from './subscriptions.js';

export const hotelsRouter = Router();
const db = getDb();

hotelsRouter.use(authenticate);

hotelsRouter.get('/mine', async (req: AuthRequest, res: Response) => {
  const myHotels = await db.queryAll(`
    SELECT h.*, hm.role as member_role FROM hotels h
    JOIN hotel_members hm ON hm.hotel_id = h.id
    WHERE hm.user_id = ?
    ORDER BY h.name ASC
  `, [req.user!.id]);
  if (myHotels.length === 0) {
    const myHotel = await db.queryOne('SELECT * FROM hotels WHERE id = ?', [req.user!.hotel_id]);
    if (myHotel) res.json([{ ...myHotel, member_role: req.user!.role }]);
    else res.json([]);
  } else {
    res.json(myHotels);
  }
});

hotelsRouter.post('/switch', async (req: AuthRequest, res: Response) => {
  const { hotel_id } = req.body;
  if (!hotel_id) return res.status(400).json({ error: 'hotel_id required' });
  const member = await db.queryOne('SELECT * FROM hotel_members WHERE user_id = ? AND hotel_id = ?', [req.user!.id, hotel_id]);
  if (!member) return res.status(403).json({ error: 'Not a member of this hotel' });
  return res.json({ hotel_id, role: member.role });
});

hotelsRouter.get('/settings', async (req: AuthRequest, res: Response) => {
  const hotel = await db.queryOne('SELECT * FROM hotels WHERE id = ?', [req.user!.hotel_id]);
  if (!hotel) return res.status(404).json({ error: 'Hotel not found' });
  res.json(hotel);
});

hotelsRouter.put('/settings', async (req: AuthRequest, res: Response) => {
  const { name, email, phone, address, logo_url, currency, tax_rate, timezone, check_in_time, check_out_time } = req.body;
  await db.execute(
    `UPDATE hotels SET name = ?, email = ?, phone = ?, address = ?, logo_url = ?, currency = ?, tax_rate = ?, timezone = ?, check_in_time = ?, check_out_time = ?, updated_at = NOW() WHERE id = ?`,
    [name, email, phone, address, logo_url, currency, tax_rate, timezone, check_in_time, check_out_time, req.user!.hotel_id]
  );
  const updated = await db.queryOne('SELECT * FROM hotels WHERE id = ?', [req.user!.hotel_id]);
  res.json(updated);
});

hotelsRouter.get('/invitations', async (req: AuthRequest, res: Response) => {
  const invitations = await db.queryAll(
    'SELECT * FROM hotel_invitations WHERE hotel_id = ? ORDER BY created_at DESC',
    [req.user!.hotel_id]
  );
  res.json(invitations);
});

hotelsRouter.post('/invitations', async (req: AuthRequest, res: Response) => {
  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const existing = await db.queryOne(
    'SELECT id FROM users WHERE email = ? AND hotel_id = ?',
    [email, req.user!.hotel_id]
  );
  if (existing) return res.status(409).json({ error: 'User already belongs to this hotel' });

  const { maxUsers } = await getPlanLimits(req.user!.hotel_id);
  const { count: userCount } = (await db.queryOne('SELECT COUNT(*) as count FROM users WHERE hotel_id = ?', [req.user!.hotel_id])) || { count: 0 };
  const { count: pendingInvites } = (await db.queryOne(
    "SELECT COUNT(*) as count FROM hotel_invitations WHERE hotel_id = ? AND expires_at > NOW()", [req.user!.hotel_id]
  )) || { count: 0 };
  if (userCount + pendingInvites >= maxUsers) {
    return res.status(402).json({ error: `Your plan allows up to ${maxUsers} users. Upgrade to invite more.`, code: 'PLAN_LIMIT_REACHED' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const id = uuid();
  await db.execute(
    'INSERT INTO hotel_invitations (id, hotel_id, email, token, role, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.user!.hotel_id, email, token, role || 'receptionist', expiresAt]
  );

  const hotel = await db.queryOne('SELECT name FROM hotels WHERE id = ?', [req.user!.hotel_id]);
  sendEmailVerification(email, {
    name: email.split('@')[0],
    token,
  });

  res.status(201).json({ message: 'Invitation sent', id, email, role: role || 'receptionist' });
});

hotelsRouter.delete('/invitations/:id', async (req: AuthRequest, res: Response) => {
  const existing = await db.queryOne('SELECT id FROM hotel_invitations WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Invitation not found' });
  await db.execute('DELETE FROM hotel_invitations WHERE id = ?', [req.params.id]);
  res.json({ message: 'Invitation cancelled' });
});
