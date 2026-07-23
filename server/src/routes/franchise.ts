import { Router, Response, NextFunction } from 'express';
import { getDb } from '../db.js';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
const db = getDb();

const router = Router();

const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required'),
  settings: z.record(z.any()).optional().default({}),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).optional(),
  settings: z.record(z.any()).optional(),
});

const addMemberSchema = z.object({
  hotel_id: z.string().min(1),
  role: z.enum(['owner', 'member', 'affiliate']).optional().default('member'),
});

// List franchise groups for hotel
router.get('/groups', (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const groups = db.queryAll(`
      SELECT fg.*, (SELECT COUNT(*) FROM franchise_members WHERE group_id=fg.id) as member_count
      FROM franchise_groups fg
      WHERE fg.parent_hotel_id=? OR fg.id IN (SELECT group_id FROM franchise_members WHERE hotel_id=?)
      ORDER BY fg.name
    `, [req.user!.hotel_id, req.user!.hotel_id]);
    res.json(groups);
  } catch (e: any) { next(e); }
});

// Create franchise group
router.post('/groups', validate(createGroupSchema), (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, settings } = req.body;
    const id = uuid();
    db.execute('INSERT INTO franchise_groups (id, name, parent_hotel_id, settings) VALUES (?,?,?,?)',
      [id, name, req.user!.hotel_id, JSON.stringify(settings)]);
    // Add creator as owner
    db.execute('INSERT INTO franchise_members (id, group_id, hotel_id, role) VALUES (?,?,?,?)',
      [uuid(), id, req.user!.hotel_id, 'owner']);
    res.json({ id });
  } catch (e: any) { next(e); }
});

// Update group
router.put('/groups/:id', validate(updateGroupSchema), (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = db.queryOne('SELECT * FROM franchise_groups WHERE id=?', [req.params.id]);
    const { name, settings } = req.body;
    db.execute('UPDATE franchise_groups SET name=?, settings=? WHERE id=?', [name ?? existing?.name, settings !== undefined ? JSON.stringify(settings) : existing?.settings, req.params.id]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// Delete group
router.delete('/groups/:id', (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    db.execute('DELETE FROM franchise_members WHERE group_id=?', [req.params.id]);
    db.execute('DELETE FROM franchise_groups WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// Members of a group
router.get('/groups/:id/members', (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const members = db.queryAll(`
      SELECT fm.*, h.name as hotel_name
      FROM franchise_members fm
      JOIN hotels h ON h.id=fm.hotel_id
      WHERE fm.group_id=?
    `, [req.params.id]);
    res.json(members);
  } catch (e: any) { next(e); }
});

// Add member to group
router.post('/groups/:id/members', validate(addMemberSchema), (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { hotel_id, role } = req.body;
    db.execute('INSERT OR IGNORE INTO franchise_members (id, group_id, hotel_id, role) VALUES (?,?,?,?)',
      [uuid(), req.params.id, hotel_id, role]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// Remove member
router.delete('/members/:memberId', (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    db.execute('DELETE FROM franchise_members WHERE id=?', [req.params.memberId]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// Cross-property report aggregation
router.get('/consolidated', (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const groups = db.queryAll(`
      SELECT fg.* FROM franchise_groups fg
      JOIN franchise_members fm ON fm.group_id=fg.id
      WHERE fm.hotel_id=? AND fm.role='owner'
    `, [req.user!.hotel_id]);
    const result: any[] = [];
    for (const g of groups) {
      const members = db.queryAll('SELECT hotel_id FROM franchise_members WHERE group_id=?', [g.id]);
      const hotelIds = members.map((m: any) => m.hotel_id);
      if (hotelIds.length === 0) continue;
      const placeholders = hotelIds.map(() => '?').join(',');
      const occupancy = db.queryAll(`SELECT AVG(1.0 * cnt / capacity) as rate FROM (SELECT h.id, COUNT(b.id) as cnt, (SELECT COUNT(*) FROM rooms r2 WHERE r2.hotel_id=h.id GROUP BY h.id) as capacity FROM hotels h LEFT JOIN bookings b ON b.hotel_id=h.id AND (b.status='checked_in' OR b.status='confirmed') WHERE h.id IN (${placeholders}) GROUP BY h.id)`, hotelIds);
      const revenue = db.queryAll(`SELECT COALESCE(SUM(p.amount),0) as total FROM payments p JOIN bookings b ON b.id=p.booking_id WHERE b.hotel_id IN (${placeholders}) AND p.created_at >= datetime('now','-30 days')`, hotelIds);
      const bookings = db.queryAll(`SELECT COUNT(*) as total FROM bookings WHERE hotel_id IN (${placeholders}) AND created_at >= datetime('now','-30 days')`, hotelIds);
      result.push({ group: g, members: members.length, occupancy: occupancy[0]?.rate || 0, revenue: revenue[0]?.total || 0, bookings: bookings[0]?.total || 0 });
    }
    res.json(result);
  } catch (e: any) { next(e); }
});

export default router;
