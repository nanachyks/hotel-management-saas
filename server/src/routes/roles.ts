import { Router, Response, NextFunction } from 'express';
import { getDb } from '../db.js';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { AuthRequest, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
const db = getDb();

const router = Router();
router.use(requireRole('admin', 'owner'));

const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  permissions: z.array(z.string()).optional().default([]),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  permissions: z.array(z.string()).optional(),
});

const assignRoleSchema = z.object({
  user_id: z.string().min(1),
  role_id: z.string().min(1),
});

const ALL_PERMISSIONS = [
  'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.cancel',
  'guests.view', 'guests.create', 'guests.edit',
  'rooms.view', 'rooms.edit', 'rooms.manage',
  'housekeeping.view', 'housekeeping.assign',
  'inventory.view', 'inventory.edit', 'inventory.transact',
  'billing.view', 'billing.create', 'billing.edit', 'billing.refund',
  'reports.view', 'reports.export',
  'users.view', 'users.create', 'users.edit', 'users.delete',
  'settings.view', 'settings.edit',
  'payroll.view', 'payroll.run',
  'integrations.view', 'integrations.edit',
  'corporate.view', 'corporate.edit',
  'franchise.view', 'franchise.edit',
  'ai.view',
];

export { ALL_PERMISSIONS };

// List roles
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const roles = await db.queryAll('SELECT * FROM custom_roles WHERE hotel_id=? ORDER BY name', [req.user!.hotel_id]);
    res.json(roles);
  } catch (e: any) { next(e); }
});

// Create role
router.post('/', validate(createRoleSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, permissions } = req.body;
    const id = uuid();
    await db.execute('INSERT INTO custom_roles (id, hotel_id, name, permissions) VALUES (?,?,?,?)',
      [id, req.user!.hotel_id, name, JSON.stringify(permissions)]);
    res.json({ id });
  } catch (e: any) { next(e); }
});

// Update role
router.put('/:id', validate(updateRoleSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await db.queryOne('SELECT * FROM custom_roles WHERE id=? AND hotel_id=?', [req.params.id, req.user!.hotel_id]);
    if (!existing) return res.status(404).json({ error: 'Role not found' });
    const { name, permissions } = req.body;
    await db.execute('UPDATE custom_roles SET name=?, permissions=? WHERE id=? AND hotel_id=?',
      [name ?? existing.name, permissions !== undefined ? JSON.stringify(permissions) : existing.permissions, req.params.id, req.user!.hotel_id]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// Delete role
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await db.execute('DELETE FROM custom_roles WHERE id=? AND hotel_id=?', [req.params.id, req.user!.hotel_id]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// Assign role to user
router.post('/assign', validate(assignRoleSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { user_id, role_id } = req.body;
    const user = await db.queryOne('SELECT id FROM users WHERE id=? AND hotel_id=?', [user_id, req.user!.hotel_id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const role = await db.queryOne('SELECT id FROM custom_roles WHERE id=? AND hotel_id=?', [role_id, req.user!.hotel_id]);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    await db.execute('UPDATE users SET role_id=? WHERE id=? AND hotel_id=?', [role_id, user_id, req.user!.hotel_id]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

export default router;
