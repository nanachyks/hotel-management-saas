import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../db.js';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
const db = getDb();

const router = Router();

function generateApiKey() { return 'he_' + crypto.randomBytes(24).toString('hex'); }
function generateSecret() { return crypto.randomBytes(32).toString('hex'); }

// List API keys
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const keys = db.queryAll('SELECT id, name, key, permissions, ip_whitelist, rate_limit, enabled, last_used_at, created_at FROM api_keys WHERE hotel_id=? ORDER BY created_at DESC', [req.hotelId]);
    res.json(keys);
  } catch (e: any) { next(e); }
});

// Create API key
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, permissions, ip_whitelist, rate_limit } = req.body;
    const id = uuid();
    const key = generateApiKey();
    const secret = generateSecret();
    db.execute('INSERT INTO api_keys (id, hotel_id, name, key, secret, permissions, ip_whitelist, rate_limit) VALUES (?,?,?,?,?,?,?,?)',
      [id, req.hotelId, name, key, secret, JSON.stringify(permissions || ['read']), JSON.stringify(ip_whitelist || []), rate_limit || 100]);
    // Return secret only on creation
    res.json({ id, key, secret, name });
  } catch (e: any) { next(e); }
});

// Update API key
router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, permissions, ip_whitelist, rate_limit, enabled } = req.body;
    db.execute('UPDATE api_keys SET name=?, permissions=?, ip_whitelist=?, rate_limit=?, enabled=? WHERE id=? AND hotel_id=?',
      [name, JSON.stringify(permissions || []), JSON.stringify(ip_whitelist || []), rate_limit, enabled, req.params.id, req.hotelId]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// Delete API key
router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    db.execute('DELETE FROM api_keys WHERE id=? AND hotel_id=?', [req.params.id, req.hotelId]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// Regenerate secret
router.post('/:id/regenerate', (req: Request, res: Response, next: NextFunction) => {
  try {
    const secret = generateSecret();
    db.execute('UPDATE api_keys SET secret=? WHERE id=? AND hotel_id=?', [secret, req.params.id, req.hotelId]);
    res.json({ secret });
  } catch (e: any) { next(e); }
});

export default router;
