import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getDb } from '../db.js';

const db = getDb();

export interface ApiKeyRequest extends Request {
  apiKeyAuth?: { keyId: string; hotelId: string; permissions: string[] };
}

// Per-key sliding window counter, matching the `rate_limit` field already exposed
// on the ApiKeys management page (requests allowed per 15-minute window).
const WINDOW_MS = 15 * 60 * 1000;
const usage = new Map<string, { count: number; resetAt: number }>();

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function authenticateApiKey(req: ApiKeyRequest, res: Response, next: NextFunction) {
  const key = req.header('X-API-Key');
  const secret = req.header('X-API-Secret');
  if (!key || !secret) {
    return res.status(401).json({ error: 'X-API-Key and X-API-Secret headers are required' });
  }

  const record = await db.queryOne('SELECT * FROM api_keys WHERE key = ?', [key]);
  const secretHash = crypto.createHash('sha256').update(secret).digest('hex');
  if (!record || !record.enabled || !timingSafeEqual(record.secret_hash, secretHash)) {
    return res.status(401).json({ error: 'Invalid API key or secret' });
  }

  const whitelist: string[] = JSON.parse(record.ip_whitelist || '[]');
  if (whitelist.length > 0 && !whitelist.includes(req.ip || '')) {
    return res.status(403).json({ error: 'Request IP is not whitelisted for this API key' });
  }

  const now = Date.now();
  let bucket = usage.get(record.id);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    usage.set(record.id, bucket);
  }
  bucket.count++;
  if (bucket.count > record.rate_limit) {
    return res.status(429).json({ error: 'API key rate limit exceeded' });
  }

  db.execute('UPDATE api_keys SET last_used_at = NOW() WHERE id = ?', [record.id]).catch(() => {});

  req.apiKeyAuth = { keyId: record.id, hotelId: record.hotel_id, permissions: JSON.parse(record.permissions || '[]') };
  next();
}

export function requireApiPermission(permission: 'read' | 'write') {
  return (req: ApiKeyRequest, res: Response, next: NextFunction) => {
    if (!req.apiKeyAuth?.permissions.includes(permission)) {
      return res.status(403).json({ error: `This API key does not have '${permission}' permission` });
    }
    next();
  };
}
