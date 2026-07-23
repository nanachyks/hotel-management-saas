import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest, authenticate } from '../middleware/auth.js';

export const depositsRouter = Router();
const db = getDb();

depositsRouter.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const { booking_id } = req.query;
  let query = 'SELECT d.*, b.guest_id FROM deposits d JOIN bookings b ON d.booking_id = b.id WHERE b.hotel_id = ?';
  const params: string[] = [req.user!.hotel_id];
  if (booking_id) { query += ' AND d.booking_id = ?'; params.push(booking_id as string); }
  query += ' ORDER BY d.created_at DESC';
  const deposits = db.queryAll(query, params);
  res.json(deposits);
});

depositsRouter.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const { booking_id, amount, method } = req.body;
  if (!booking_id || !amount || !method) return res.status(400).json({ error: 'booking_id, amount, and method are required' });
  const validMethods = ['cash', 'card', 'mobile_money', 'bank_transfer'];
  if (!validMethods.includes(method)) return res.status(400).json({ error: 'Invalid payment method' });

  const booking = db.queryOne('SELECT * FROM bookings WHERE id = ? AND hotel_id = ?', [booking_id, req.user!.hotel_id]);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const id = uuid();
  db.execute('INSERT INTO deposits (id, booking_id, amount, method) VALUES (?, ?, ?, ?)', [id, booking_id, amount, method]);

  const invoice = db.queryOne('SELECT * FROM invoices WHERE booking_id = ?', [booking_id]);
  if (invoice) {
    const newDeposit = (invoice.deposit || 0) + Number(amount);
    db.execute('UPDATE invoices SET deposit = ? WHERE id = ?', [newDeposit, invoice.id]);
  }

  const created = db.queryOne('SELECT * FROM deposits WHERE id = ?', [id]);
  res.status(201).json(created);
});

depositsRouter.delete('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const deposit = db.queryOne(
    'SELECT d.* FROM deposits d JOIN bookings b ON d.booking_id = b.id WHERE d.id = ? AND b.hotel_id = ?',
    [req.params.id, req.user!.hotel_id]
  );
  if (!deposit) return res.status(404).json({ error: 'Deposit not found' });

  const invoice = db.queryOne('SELECT * FROM invoices WHERE booking_id = ?', [deposit.booking_id]);
  if (invoice) {
    const newDeposit = Math.max(0, (invoice.deposit || 0) - deposit.amount);
    db.execute('UPDATE invoices SET deposit = ? WHERE id = ?', [newDeposit, invoice.id]);
  }

  db.execute('DELETE FROM deposits WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deposit deleted' });
});
