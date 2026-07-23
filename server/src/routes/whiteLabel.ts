import { Router, Response, NextFunction } from 'express';
import { getDb } from '../db.js';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
const db = getDb();

const router = Router();

const updateWhiteLabelSchema = z.object({
  custom_domain: z.string().optional().default(''),
  favicon_url: z.string().optional().default(''),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be hex color').optional().default('#3b82f6'),
  logo_url: z.string().optional().default(''),
  email_from_name: z.string().optional().default(''),
  email_logo_url: z.string().optional().default(''),
  custom_css: z.string().optional().default(''),
  footer_text: z.string().optional().default(''),
});

// Get white-label settings
router.get('/', (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let row = db.queryAll('SELECT * FROM white_label_settings WHERE hotel_id=?', [req.user!.hotel_id]);
    if (!row.length) {
      const id = uuid();
      db.execute('INSERT INTO white_label_settings (id, hotel_id) VALUES (?,?)', [id, req.user!.hotel_id]);
      row = db.queryAll('SELECT * FROM white_label_settings WHERE id=?', [id]);
    }
    res.json(row[0]);
  } catch (e: any) { next(e); }
});

// Update white-label settings
router.put('/', validate(updateWhiteLabelSchema), (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { custom_domain, favicon_url, primary_color, logo_url, email_from_name, email_logo_url, custom_css, footer_text } = req.body;
    const existing = db.queryAll('SELECT id FROM white_label_settings WHERE hotel_id=?', [req.user!.hotel_id]);
    if (!existing.length) {
      const id = uuid();
      db.execute('INSERT INTO white_label_settings (id, hotel_id, custom_domain, favicon_url, primary_color, logo_url, email_from_name, email_logo_url, custom_css, footer_text) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [id, req.user!.hotel_id, custom_domain || '', favicon_url || '', primary_color || '#3b82f6', logo_url || '', email_from_name || '', email_logo_url || '', custom_css || '', footer_text || '']);
    } else {
      db.execute(`UPDATE white_label_settings SET custom_domain=?, favicon_url=?, primary_color=?, logo_url=?, email_from_name=?, email_logo_url=?, custom_css=?, footer_text=?, updated_at=datetime('now') WHERE hotel_id=?`,
        [custom_domain || '', favicon_url || '', primary_color || '#3b82f6', logo_url || '', email_from_name || '', email_logo_url || '', custom_css || '', footer_text || '', req.user!.hotel_id]);
    }
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

export default router;
