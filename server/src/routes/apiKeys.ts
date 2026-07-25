import { Router, Response, NextFunction } from 'express';
import { getDb } from '../db.js';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import crypto from 'crypto';
const db = getDb();

const router = Router();

const createApiKeySchema = z.object({
  name: z.string().min(1, 'API key name is required'),
  permissions: z.array(z.string()).optional().default(['read']),
  ip_whitelist: z.array(z.string()).optional().default([]),
  rate_limit: z.number().int().min(1).max(10000).optional().default(100),
});

const updateApiKeySchema = z.object({
  name: z.string().min(1).optional(),
  permissions: z.array(z.string()).optional(),
  ip_whitelist: z.array(z.string()).optional(),
  rate_limit: z.number().int().min(1).max(10000).optional(),
  enabled: z.boolean().optional(),
});

function generateApiKey() { return 'he_' + crypto.randomBytes(24).toString('hex'); }
function generateSecret() { return crypto.randomBytes(32).toString('hex'); }

// List API keys
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const keys = await db.queryAll('SELECT id, name, key, permissions, ip_whitelist, rate_limit, enabled, last_used_at, created_at FROM api_keys WHERE hotel_id=? ORDER BY created_at DESC', [req.user!.hotel_id]);
    res.json(keys);
  } catch (e: any) { next(e); }
});

// Create API key
router.post('/', validate(createApiKeySchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, permissions, ip_whitelist, rate_limit } = req.body;
    const id = uuid();
    const key = generateApiKey();
    const secret = generateSecret();
    await db.execute('INSERT INTO api_keys (id, hotel_id, name, key, secret, permissions, ip_whitelist, rate_limit) VALUES (?,?,?,?,?,?,?,?)',
      [id, req.user!.hotel_id, name, key, secret, JSON.stringify(permissions), JSON.stringify(ip_whitelist), rate_limit]);
    // Return secret only on creation
    res.json({ id, key, secret, name });
  } catch (e: any) { next(e); }
});

// Update API key
router.put('/:id', validate(updateApiKeySchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await db.queryOne('SELECT * FROM api_keys WHERE id=? AND hotel_id=?', [req.params.id, req.user!.hotel_id]);
    if (!existing) return res.status(404).json({ error: 'API key not found' });
    const { name, permissions, ip_whitelist, rate_limit, enabled } = req.body;
    await db.execute('UPDATE api_keys SET name=?, permissions=?, ip_whitelist=?, rate_limit=?, enabled=? WHERE id=? AND hotel_id=?',
      [name ?? existing.name, JSON.stringify(permissions ?? JSON.parse(existing.permissions)), JSON.stringify(ip_whitelist ?? JSON.parse(existing.ip_whitelist)), rate_limit ?? existing.rate_limit, enabled !== undefined ? enabled : existing.enabled, req.params.id, req.user!.hotel_id]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// Delete API key
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await db.execute('DELETE FROM api_keys WHERE id=? AND hotel_id=?', [req.params.id, req.user!.hotel_id]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// Regenerate secret
router.post('/:id/regenerate', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await db.queryOne('SELECT id FROM api_keys WHERE id=? AND hotel_id=?', [req.params.id, req.user!.hotel_id]);
    if (!existing) return res.status(404).json({ error: 'API key not found' });
    const secret = generateSecret();
    await db.execute('UPDATE api_keys SET secret=? WHERE id=? AND hotel_id=?', [secret, req.params.id, req.user!.hotel_id]);
    res.json({ secret });
  } catch (e: any) { next(e); }
});

export default router;
