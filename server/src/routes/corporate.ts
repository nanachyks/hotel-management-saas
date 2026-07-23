import { Router, Response, NextFunction } from 'express';
import { getDb } from '../db.js';
import { v4 as uuid } from 'uuid';
import { AuthRequest } from '../middleware/auth.js';
const db = getDb();

const router = Router();

// List corporate accounts
router.get('/', (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = db.queryAll('SELECT * FROM corporate_accounts WHERE hotel_id = ? ORDER BY created_at DESC', [req.user!.hotel_id]);
    res.json(rows);
  } catch (e: any) { next(e); }
});

// Create corporate account
router.post('/', (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { company_name, contact_name, contact_email, contact_phone, credit_limit, payment_terms, discount_rate, notes } = req.body;
    const id = uuid();
    db.execute('INSERT INTO corporate_accounts (id, hotel_id, company_name, contact_name, contact_email, contact_phone, credit_limit, payment_terms, discount_rate, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [id, req.user!.hotel_id, company_name, contact_name || '', contact_email || '', contact_phone || '', credit_limit || 0, payment_terms || 'net30', discount_rate || 0, notes || '']);
    res.json({ id });
  } catch (e: any) { next(e); }
});

// Update corporate account
router.put('/:id', (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = db.queryOne('SELECT * FROM corporate_accounts WHERE id=? AND hotel_id=?', [req.params.id, req.user!.hotel_id]);
    if (!existing) return res.status(404).json({ error: 'Corporate account not found' });
    const { company_name, contact_name, contact_email, contact_phone, credit_limit, payment_terms, discount_rate, notes, status } = req.body;
    db.execute(`UPDATE corporate_accounts SET company_name=?, contact_name=?, contact_email=?, contact_phone=?, credit_limit=?, payment_terms=?, discount_rate=?, notes=?, status=?, updated_at=datetime('now') WHERE id=? AND hotel_id=?`,
      [company_name ?? existing.company_name, contact_name ?? existing.contact_name, contact_email ?? existing.contact_email, contact_phone ?? existing.contact_phone, credit_limit ?? existing.credit_limit, payment_terms ?? existing.payment_terms, discount_rate ?? existing.discount_rate, notes ?? existing.notes, status ?? existing.status, req.params.id, req.user!.hotel_id]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// Delete corporate account
router.delete('/:id', (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    db.execute('DELETE FROM corporate_accounts WHERE id=? AND hotel_id=?', [req.params.id, req.user!.hotel_id]);
    db.execute('DELETE FROM corporate_rates WHERE account_id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// ── Corporate Rates ──

router.get('/:id/rates', (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rates = db.queryAll('SELECT cr.*, rt.name as room_type_name FROM corporate_rates cr JOIN room_types rt ON rt.id=cr.room_type_id WHERE cr.account_id=?', [req.params.id]);
    res.json(rates);
  } catch (e: any) { next(e); }
});

router.post('/:id/rates', (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { room_type_id, negotiated_price, valid_from, valid_until } = req.body;
    const id = uuid();
    db.execute('INSERT INTO corporate_rates (id, account_id, room_type_id, negotiated_price, valid_from, valid_until) VALUES (?,?,?,?,?,?)',
      [id, req.params.id, room_type_id, negotiated_price, valid_from || null, valid_until || null]);
    res.json({ id });
  } catch (e: any) { next(e); }
});

router.delete('/rates/:rateId', (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    db.execute('DELETE FROM corporate_rates WHERE id=?', [req.params.rateId]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

export default router;
