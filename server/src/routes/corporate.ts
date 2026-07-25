import { Router, Response, NextFunction } from 'express';
import { getDb } from '../db.js';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
const db = getDb();

const router = Router();

const createCorporateSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  contact_name: z.string().optional().default(''),
  contact_email: z.string().email().optional().or(z.literal('')).default(''),
  contact_phone: z.string().optional().default(''),
  credit_limit: z.number().min(0).optional().default(0),
  payment_terms: z.enum(['net15', 'net30', 'net45', 'net60', 'prepaid']).optional().default('net30'),
  discount_rate: z.number().min(0).max(100).optional().default(0),
  notes: z.string().optional().default(''),
});

const updateCorporateSchema = z.object({
  company_name: z.string().min(1).optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  credit_limit: z.number().min(0).optional(),
  payment_terms: z.enum(['net15', 'net30', 'net45', 'net60', 'prepaid']).optional(),
  discount_rate: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

const createRateSchema = z.object({
  room_type_id: z.string().min(1, 'Room type is required'),
  negotiated_price: z.number().min(0, 'Price must be non-negative'),
  valid_from: z.string().optional().nullable(),
  valid_until: z.string().optional().nullable(),
});

// List corporate accounts
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = await db.queryAll('SELECT * FROM corporate_accounts WHERE hotel_id = ? ORDER BY created_at DESC', [req.user!.hotel_id]);
    res.json(rows);
  } catch (e: any) { next(e); }
});

// Create corporate account
router.post('/', validate(createCorporateSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { company_name, contact_name, contact_email, contact_phone, credit_limit, payment_terms, discount_rate, notes } = req.body;
    const id = uuid();
    await db.execute('INSERT INTO corporate_accounts (id, hotel_id, company_name, contact_name, contact_email, contact_phone, credit_limit, payment_terms, discount_rate, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [id, req.user!.hotel_id, company_name, contact_name, contact_email, contact_phone, credit_limit, payment_terms, discount_rate, notes]);
    res.json({ id });
  } catch (e: any) { next(e); }
});

// Update corporate account
router.put('/:id', validate(updateCorporateSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await db.queryOne('SELECT * FROM corporate_accounts WHERE id=? AND hotel_id=?', [req.params.id, req.user!.hotel_id]);
    if (!existing) return res.status(404).json({ error: 'Corporate account not found' });
    const { company_name, contact_name, contact_email, contact_phone, credit_limit, payment_terms, discount_rate, notes, status } = req.body;
    await db.execute(`UPDATE corporate_accounts SET company_name=?, contact_name=?, contact_email=?, contact_phone=?, credit_limit=?, payment_terms=?, discount_rate=?, notes=?, status=?, updated_at=NOW() WHERE id=? AND hotel_id=?`,
      [company_name ?? existing.company_name, contact_name ?? existing.contact_name, contact_email ?? existing.contact_email, contact_phone ?? existing.contact_phone, credit_limit ?? existing.credit_limit, payment_terms ?? existing.payment_terms, discount_rate ?? existing.discount_rate, notes ?? existing.notes, status ?? existing.status, req.params.id, req.user!.hotel_id]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// Delete corporate account
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await db.queryOne('SELECT id FROM corporate_accounts WHERE id=? AND hotel_id=?', [req.params.id, req.user!.hotel_id]);
    if (!existing) return res.status(404).json({ error: 'Corporate account not found' });
    await db.execute('DELETE FROM corporate_rates WHERE account_id=?', [req.params.id]);
    await db.execute('DELETE FROM corporate_accounts WHERE id=? AND hotel_id=?', [req.params.id, req.user!.hotel_id]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// ── Corporate Rates ──

router.get('/:id/rates', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await db.queryOne('SELECT id FROM corporate_accounts WHERE id=? AND hotel_id=?', [req.params.id, req.user!.hotel_id]);
    if (!account) return res.status(404).json({ error: 'Corporate account not found' });
    const rates = await db.queryAll('SELECT cr.*, rt.name as room_type_name FROM corporate_rates cr JOIN room_types rt ON rt.id=cr.room_type_id WHERE cr.account_id=?', [req.params.id]);
    res.json(rates);
  } catch (e: any) { next(e); }
});

router.post('/:id/rates', validate(createRateSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const account = await db.queryOne('SELECT id FROM corporate_accounts WHERE id=? AND hotel_id=?', [req.params.id, req.user!.hotel_id]);
    if (!account) return res.status(404).json({ error: 'Corporate account not found' });
    const { room_type_id, negotiated_price, valid_from, valid_until } = req.body;
    const roomType = await db.queryOne('SELECT id FROM room_types WHERE id=? AND hotel_id=?', [room_type_id, req.user!.hotel_id]);
    if (!roomType) return res.status(400).json({ error: 'Room type not found' });
    const id = uuid();
    await db.execute('INSERT INTO corporate_rates (id, account_id, room_type_id, negotiated_price, valid_from, valid_until) VALUES (?,?,?,?,?,?)',
      [id, req.params.id, room_type_id, negotiated_price, valid_from || null, valid_until || null]);
    res.json({ id });
  } catch (e: any) { next(e); }
});

router.delete('/rates/:rateId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rate = await db.queryOne(
      'SELECT cr.id FROM corporate_rates cr JOIN corporate_accounts ca ON ca.id = cr.account_id WHERE cr.id=? AND ca.hotel_id=?',
      [req.params.rateId, req.user!.hotel_id]
    );
    if (!rate) return res.status(404).json({ error: 'Rate not found' });
    await db.execute('DELETE FROM corporate_rates WHERE id=?', [req.params.rateId]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

export default router;
