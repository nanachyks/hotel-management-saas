import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../db.js';
import { v4 as uuid } from 'uuid';
const db = getDb();

const router = Router();

// List corporate accounts
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = db.queryAll('SELECT * FROM corporate_accounts WHERE hotel_id = ? ORDER BY created_at DESC', [req.hotelId]);
    res.json(rows);
  } catch (e: any) { next(e); }
});

// Create corporate account
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { company_name, contact_name, contact_email, contact_phone, credit_limit, payment_terms, discount_rate, notes } = req.body;
    const id = uuid();
    db.execute('INSERT INTO corporate_accounts (id, hotel_id, company_name, contact_name, contact_email, contact_phone, credit_limit, payment_terms, discount_rate, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [id, req.hotelId, company_name, contact_name || '', contact_email || '', contact_phone || '', credit_limit || 0, payment_terms || 'net30', discount_rate || 0, notes || '']);
    res.json({ id });
  } catch (e: any) { next(e); }
});

// Update corporate account
router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { company_name, contact_name, contact_email, contact_phone, credit_limit, payment_terms, discount_rate, notes, status } = req.body;
    db.execute(`UPDATE corporate_accounts SET company_name=?, contact_name=?, contact_email=?, contact_phone=?, credit_limit=?, payment_terms=?, discount_rate=?, notes=?, status=?, updated_at=datetime('now') WHERE id=? AND hotel_id=?`,
      [company_name, contact_name, contact_email, contact_phone, credit_limit, payment_terms, discount_rate, notes, status, req.params.id, req.hotelId]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// Delete corporate account
router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    db.execute('DELETE FROM corporate_accounts WHERE id=? AND hotel_id=?', [req.params.id, req.hotelId]);
    db.execute('DELETE FROM corporate_rates WHERE account_id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// ── Corporate Rates ──

router.get('/:id/rates', (req: Request, res: Response, next: NextFunction) => {
  try {
    const rates = db.queryAll('SELECT cr.*, rt.name as room_type_name FROM corporate_rates cr JOIN room_types rt ON rt.id=cr.room_type_id WHERE cr.account_id=?', [req.params.id]);
    res.json(rates);
  } catch (e: any) { next(e); }
});

router.post('/:id/rates', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { room_type_id, negotiated_price, valid_from, valid_until } = req.body;
    const id = uuid();
    db.execute('INSERT INTO corporate_rates (id, account_id, room_type_id, negotiated_price, valid_from, valid_until) VALUES (?,?,?,?,?,?)',
      [id, req.params.id, room_type_id, negotiated_price, valid_from || null, valid_until || null]);
    res.json({ id });
  } catch (e: any) { next(e); }
});

router.delete('/rates/:rateId', (req: Request, res: Response, next: NextFunction) => {
  try {
    db.execute('DELETE FROM corporate_rates WHERE id=?', [req.params.rateId]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

export default router;
