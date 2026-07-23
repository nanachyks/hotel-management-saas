import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import PDFDocument from 'pdfkit';
import { getDb } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

export const invoicesRouter = Router();
const db = getDb();

invoicesRouter.get('/', (req: AuthRequest, res: Response) => {
  const { status, page: pageStr, limit: limitStr } = req.query;
  const hasPagination = pageStr !== undefined;
  const page = Math.max(1, parseInt(pageStr as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(limitStr as string) || 200));
  const offset = (page - 1) * limit;

  const hotelId = req.user?.hotel_id;
  let query = `
    SELECT i.*, b.check_in_date, b.check_out_date, b.status as booking_status,
           g.first_name || ' ' || g.last_name as guest_name, r.room_number
    FROM invoices i
    JOIN bookings b ON i.booking_id = b.id
    JOIN guests g ON b.guest_id = g.id
    JOIN rooms r ON b.room_id = r.id
    WHERE i.hotel_id = ?
  `;
  let countQuery = `SELECT COUNT(*) as total FROM invoices i WHERE i.hotel_id = ?`;
  const params: string[] = [String(hotelId)];
  const countParams: string[] = [String(hotelId)];
  if (status) {
    query += ' AND i.status = ?';
    countQuery += ' AND i.status = ?';
    params.push(status as string);
    countParams.push(status as string);
  }
  query += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
  params.push(String(limit), String(offset));

  const invoices = db.queryAll(query, params);
  const { total } = db.queryOne(countQuery, countParams) || { total: 0 };

  if (hasPagination) {
    res.json({ data: invoices, total, page, limit });
  } else {
    res.json(invoices);
  }
});

invoicesRouter.get('/:id', (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const invoice = db.queryOne(`
    SELECT i.*, b.check_in_date, b.check_out_date, b.status as booking_status,
           g.first_name || ' ' || g.last_name as guest_name, g.email as guest_email, g.phone as guest_phone,
           r.room_number, rt.name as room_type_name, h.name as hotel_name, h.address as hotel_address, h.email as hotel_email, h.phone as hotel_phone, h.currency, h.tax_rate
    FROM invoices i
    JOIN bookings b ON i.booking_id = b.id
    JOIN guests g ON b.guest_id = g.id
    JOIN rooms r ON b.room_id = r.id
    JOIN room_types rt ON r.room_type_id = rt.id
    JOIN hotels h ON i.hotel_id = h.id
    WHERE i.id = ? AND i.hotel_id = ?
  `, [req.params.id, String(hotelId)]);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const payments = db.queryAll('SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at ASC', [req.params.id]);
  const services = db.queryAll(`
    SELECT bs.*, s.name as service_name, s.category
    FROM booking_services bs JOIN services s ON bs.service_id = s.id
    WHERE bs.booking_id = ?
  `, [invoice.booking_id]);

  res.json({ ...invoice, payments, services });
});

// Record a payment
invoicesRouter.post('/:id/pay', (req: AuthRequest, res: Response) => {
  const { amount, method, reference, notes } = req.body;
  if (!amount || !method) return res.status(400).json({ error: 'amount and method are required' });

  const hotelId = req.user?.hotel_id;
  const invoice = db.queryOne('SELECT * FROM invoices WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.status === 'paid' || invoice.status === 'cancelled') return res.status(400).json({ error: 'Invoice is already paid or cancelled' });

  const validMethods = ['cash', 'card', 'mobile_money', 'bank_transfer'];
  if (!validMethods.includes(method)) return res.status(400).json({ error: 'Invalid payment method' });

  const paymentId = uuid();
  db.execute(
    'INSERT INTO payments (id, invoice_id, amount, method, reference, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [paymentId, req.params.id, Number(amount), method, reference || '', notes || '']
  );

  const newPaid = invoice.paid_amount + Number(amount);
  const newStatus = newPaid >= invoice.amount ? 'paid' : 'partial';
  db.execute('UPDATE invoices SET paid_amount = ?, status = ? WHERE id = ? AND hotel_id = ?', [newPaid, newStatus, req.params.id, String(hotelId)]);

  const payment = db.queryOne('SELECT * FROM payments WHERE id = ?', [paymentId]);
  createNotification(String(hotelId), 'payment', 'Payment Received', `${method.replace('_', ' ')} payment of ${Number(amount).toFixed(2)} recorded`, `/invoices`);
  res.status(201).json(payment);
});

// Refund (full or partial)
invoicesRouter.post('/:id/refund', (req: AuthRequest, res: Response) => {
  const { amount } = req.body;
  const hotelId = req.user?.hotel_id;
  const invoice = db.queryOne('SELECT * FROM invoices WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.paid_amount <= 0) return res.status(400).json({ error: 'No payments to refund' });

  const refundAmount = amount || invoice.paid_amount;
  const newPaid = Math.max(0, invoice.paid_amount - refundAmount);
  const newStatus = newPaid <= 0 ? 'refunded' : 'partial';

  const paymentId = uuid();
  db.execute(
    'INSERT INTO payments (id, invoice_id, amount, method, reference, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [paymentId, req.params.id, -refundAmount, 'cash', 'REFUND', 'Refund processed']
  );

  db.execute('UPDATE invoices SET paid_amount = ?, status = ? WHERE id = ? AND hotel_id = ?', [newPaid, newStatus, req.params.id, String(hotelId)]);

  res.json({ message: 'Refund processed', refundAmount, newPaid, newStatus });
});

// Receipt PDF
invoicesRouter.get('/:id/receipt', (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const invoice = db.queryOne(`
    SELECT i.*, b.check_in_date, b.check_out_date, b.status as booking_status,
           g.first_name || ' ' || g.last_name as guest_name, g.email as guest_email, g.phone as guest_phone,
           r.room_number, rt.name as room_type_name, h.name as hotel_name, h.address as hotel_address,
           h.email as hotel_email, h.phone as hotel_phone, h.currency, h.tax_rate
    FROM invoices i
    JOIN bookings b ON i.booking_id = b.id
    JOIN guests g ON b.guest_id = g.id
    JOIN rooms r ON b.room_id = r.id
    JOIN room_types rt ON r.room_type_id = rt.id
    JOIN hotels h ON i.hotel_id = h.id
    WHERE i.id = ? AND i.hotel_id = ?
  `, [req.params.id, String(hotelId)]);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const payments = db.queryAll('SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at ASC', [req.params.id]);
  const services = db.queryAll(`
    SELECT bs.*, s.name as service_name, s.category
    FROM booking_services bs JOIN services s ON bs.service_id = s.id
    WHERE bs.booking_id = ?
  `, [invoice.booking_id]);

  const doc = new PDFDocument({ margin: 45, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="receipt-${invoice.id}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fontSize(22).font('Helvetica-Bold').text(invoice.hotel_name || 'Hotel', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(invoice.hotel_address || '', { align: 'center' });
  doc.text(`Email: ${invoice.hotel_email || ''}  Phone: ${invoice.hotel_phone || ''}`, { align: 'center' });
  doc.moveDown(1.5);
  doc.fontSize(16).font('Helvetica-Bold').text('RECEIPT', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');

  // Info
  const leftX = 45;
  let y = doc.y;
  doc.text(`Receipt #: ${invoice.id.slice(0, 8).toUpperCase()}`, leftX, y);
  doc.text(`Date: ${new Date().toISOString().split('T')[0]}`, leftX, y + 14);
  doc.text(`Due Date: ${invoice.due_date}`, leftX, y + 28);
  doc.text(`Guest: ${invoice.guest_name}`, 300, y);
  doc.text(`Room: ${invoice.room_number} (${invoice.room_type_name})`, 300, y + 14);
  doc.text(`Check-in: ${invoice.check_in_date}  Check-out: ${invoice.check_out_date}`, 300, y + 28);
  doc.moveDown(3);

  // Services table
  if (services.length > 0) {
    doc.fontSize(12).font('Helvetica-Bold').text('Services', leftX);
    doc.moveDown(0.5);
    doc.fontSize(9);
    doc.text('Service', leftX, doc.y, { width: 200 });
    doc.text('Qty', 250, doc.y - 12, { width: 50 });
    doc.text('Price', 350, doc.y - 12, { width: 100 });
    doc.moveDown(0.3);
    doc.font('Helvetica');
    for (const svc of services) {
      doc.text(svc.service_name, leftX, doc.y, { width: 200 });
      doc.text(String(svc.quantity), 250, doc.y - 12, { width: 50 });
      doc.text(`${invoice.currency || 'USD'} ${svc.price.toFixed(2)}`, 350, doc.y - 12, { width: 100 });
    }
    doc.moveDown(0.5);
  }

  // Summary
  doc.moveDown(1);
  const subtotal = invoice.amount - (invoice.tax_amount || 0);
  doc.font('Helvetica');
  doc.text(`Subtotal:`, 350, doc.y, { width: 100 });
  doc.text(`${invoice.currency || 'USD'} ${subtotal.toFixed(2)}`, 400, doc.y - 12, { width: 100 });
  doc.text(`Tax (${invoice.tax_rate || 0}%):`, 350, doc.y, { width: 100 });
  doc.text(`${invoice.currency || 'USD'} ${(invoice.tax_amount || 0).toFixed(2)}`, 400, doc.y - 12, { width: 100 });
  if (invoice.discount > 0) {
    doc.text(`Discount:`, 350, doc.y, { width: 100 });
    doc.text(`-${invoice.currency || 'USD'} ${invoice.discount.toFixed(2)}`, 400, doc.y - 12, { width: 100 });
  }
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text(`Total:`, 330, doc.y + 10, { width: 100 });
  doc.text(`${invoice.currency || 'USD'} ${(invoice.amount - (invoice.discount || 0)).toFixed(2)}`, 380, doc.y - 12, { width: 100 });
  doc.moveDown(0.5);

  // Payments
  if (payments.length > 0) {
    doc.fontSize(10).font('Helvetica-Bold').text('Payment History', leftX);
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica');
    for (const p of payments) {
      const method = p.amount > 0 ? p.method.replace('_', ' ') : 'Refund';
      doc.text(`${p.created_at?.slice(0, 10)} - ${method}: ${invoice.currency || 'USD'} ${Math.abs(p.amount).toFixed(2)}`, leftX, doc.y);
    }
  }

  doc.moveDown(1);
  doc.fontSize(9).font('Helvetica').text(`Status: ${invoice.status}`, leftX);
  if (invoice.notes) doc.text(`Notes: ${invoice.notes}`, leftX);

  doc.end();
});

invoicesRouter.put('/:id', (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const existing = db.queryOne('SELECT * FROM invoices WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  if (!existing) return res.status(404).json({ error: 'Invoice not found' });

  const { amount, paid_amount, discount, tax_amount, deposit, notes, status, due_date } = req.body;
  db.execute(
    'UPDATE invoices SET amount = ?, paid_amount = ?, discount = ?, tax_amount = ?, deposit = ?, notes = ?, status = ?, due_date = ? WHERE id = ? AND hotel_id = ?',
    [amount ?? existing.amount, paid_amount ?? existing.paid_amount, discount ?? existing.discount, tax_amount ?? existing.tax_amount, deposit ?? existing.deposit, notes ?? existing.notes, status ?? existing.status, due_date ?? existing.due_date, req.params.id, String(hotelId)]
  );
  const updated = db.queryOne('SELECT * FROM invoices WHERE id = ? AND hotel_id = ?', [req.params.id, String(hotelId)]);
  res.json(updated);
});
