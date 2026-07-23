import { Router, Response } from 'express';
import PDFDocument from 'pdfkit';
import { getDb } from '../db.js';
import { AuthRequest, authenticate } from '../middleware/auth.js';

export const exportRouter = Router();
const db = getDb();

function toCSV(headers: string[], rows: any[], keys: string[]): string {
  const escape = (v: any) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map(r => keys.map(k => escape(r[k])).join(','))].join('\n');
}

function addHeader(doc: PDFKit.PDFDocument, title: string) {
  doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(1.5);
}

function addTable(doc: PDFKit.PDFDocument, headers: string[], rows: string[][]) {
  const colWidth = 500 / headers.length;
  const startX = 45;
  let y = doc.y;

  doc.fontSize(9).font('Helvetica-Bold');
  headers.forEach((h, i) => doc.text(h, startX + i * colWidth, y, { width: colWidth }));
  y += 18;
  doc.font('Helvetica');

  for (const row of rows) {
    if (y > 720) { doc.addPage(); y = 40; }
    doc.fontSize(8);
    row.forEach((cell, i) => doc.text(cell, startX + i * colWidth, y, { width: colWidth }));
    y += 16;
  }
}

// ── Bookings ──
exportRouter.get('/bookings/csv', authenticate, (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const bookings = db.queryAll(`
    SELECT b.id, b.check_in_date, b.check_out_date, b.status, b.total_amount,
      g.first_name || ' ' || g.last_name as guest, r.room_number
    FROM bookings b JOIN guests g ON b.guest_id = g.id JOIN rooms r ON b.room_id = r.id
    WHERE b.hotel_id = ?
    ORDER BY b.created_at DESC
  `, [String(hotelId)]);
  const csv = toCSV(
    ['ID', 'Guest', 'Room', 'Check-in', 'Check-out', 'Status', 'Total'],
    bookings,
    ['id', 'guest', 'room_number', 'check_in_date', 'check_out_date', 'status', 'total_amount']
  );
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="bookings.csv"');
  res.send(csv);
});

exportRouter.get('/bookings/pdf', authenticate, (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const bookings = db.queryAll(`
    SELECT b.id, b.check_in_date, b.check_out_date, b.status, b.total_amount,
      g.first_name || ' ' || g.last_name as guest, r.room_number
    FROM bookings b JOIN guests g ON b.guest_id = g.id JOIN rooms r ON b.room_id = r.id
    WHERE b.hotel_id = ?
    ORDER BY b.created_at DESC
  `, [String(hotelId)]);
  const doc = new PDFDocument({ margin: 45, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="bookings.pdf"');
  doc.pipe(res);
  addHeader(doc, 'Bookings Report');
  addTable(doc, ['Guest', 'Room', 'Check-in', 'Check-out', 'Status', 'Total'],
    bookings.map((b: any) => [b.guest, b.room_number, b.check_in_date, b.check_out_date, b.status, `GHS ${b.total_amount}`])
  );
  doc.end();
});

// ── Invoices ──
exportRouter.get('/invoices/csv', authenticate, (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const invoices = db.queryAll(`
    SELECT i.id, i.amount, i.paid_amount, i.status, i.issued_date, i.due_date,
      g.first_name || ' ' || g.last_name as guest
    FROM invoices i JOIN bookings b ON i.booking_id = b.id JOIN guests g ON b.guest_id = g.id
    WHERE i.hotel_id = ?
    ORDER BY i.created_at DESC
  `, [String(hotelId)]);
  const csv = toCSV(
    ['ID', 'Guest', 'Amount', 'Paid', 'Status', 'Issued', 'Due'],
    invoices,
    ['id', 'guest', 'amount', 'paid_amount', 'status', 'issued_date', 'due_date']
  );
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"');
  res.send(csv);
});

exportRouter.get('/invoices/pdf', authenticate, (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const invoices = db.queryAll(`
    SELECT i.id, i.amount, i.paid_amount, i.status, i.issued_date, i.due_date,
      g.first_name || ' ' || g.last_name as guest
    FROM invoices i JOIN bookings b ON i.booking_id = b.id JOIN guests g ON b.guest_id = g.id
    WHERE i.hotel_id = ?
    ORDER BY i.created_at DESC
  `, [String(hotelId)]);
  const doc = new PDFDocument({ margin: 45, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="invoices.pdf"');
  doc.pipe(res);
  addHeader(doc, 'Invoices Report');
  addTable(doc, ['Guest', 'Amount', 'Paid', 'Status', 'Issued', 'Due'],
    invoices.map((i: any) => [i.guest, `GHS ${i.amount}`, `GHS ${i.paid_amount}`, i.status, i.issued_date, i.due_date])
  );
  doc.end();
});

// ── Guests ──
exportRouter.get('/guests/csv', authenticate, (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const guests = db.queryAll('SELECT id, first_name, last_name, email, phone, id_card_number FROM guests WHERE hotel_id = ? ORDER BY first_name', [String(hotelId)]);
  const csv = toCSV(
    ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'ID Card'],
    guests,
    ['id', 'first_name', 'last_name', 'email', 'phone', 'id_card_number']
  );
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="guests.csv"');
  res.send(csv);
});

exportRouter.get('/guests/pdf', authenticate, (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const guests = db.queryAll('SELECT id, first_name, last_name, email, phone, id_card_number FROM guests WHERE hotel_id = ? ORDER BY first_name', [String(hotelId)]);
  const doc = new PDFDocument({ margin: 45, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="guests.pdf"');
  doc.pipe(res);
  addHeader(doc, 'Guests Report');
  addTable(doc, ['First Name', 'Last Name', 'Email', 'Phone', 'ID Card'],
    guests.map((g: any) => [g.first_name, g.last_name, g.email, g.phone, g.id_card_number || '-'])
  );
  doc.end();
});

// ── Services ──
exportRouter.get('/services/csv', authenticate, (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const services = db.queryAll('SELECT id, name, description, price, category FROM services WHERE hotel_id = ? ORDER BY name', [String(hotelId)]);
  const csv = toCSV(
    ['ID', 'Name', 'Description', 'Price', 'Category'],
    services,
    ['id', 'name', 'description', 'price', 'category']
  );
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="services.csv"');
  res.send(csv);
});

exportRouter.get('/services/pdf', authenticate, (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const services = db.queryAll('SELECT id, name, description, price, category FROM services WHERE hotel_id = ? ORDER BY name', [String(hotelId)]);
  const doc = new PDFDocument({ margin: 45, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="services.pdf"');
  doc.pipe(res);
  addHeader(doc, 'Services Report');
  addTable(doc, ['Name', 'Description', 'Price', 'Category'],
    services.map((s: any) => [s.name, s.description, `GHS ${s.price}`, s.category])
  );
  doc.end();
});

// ── Room Types ──
exportRouter.get('/room-types/csv', authenticate, (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const types = db.queryAll('SELECT id, name, description, base_price, capacity FROM room_types WHERE hotel_id = ? ORDER BY name', [String(hotelId)]);
  const csv = toCSV(
    ['ID', 'Name', 'Description', 'Base Price', 'Capacity'],
    types,
    ['id', 'name', 'description', 'base_price', 'capacity']
  );
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="room-types.csv"');
  res.send(csv);
});

exportRouter.get('/room-types/pdf', authenticate, (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const types = db.queryAll('SELECT id, name, description, base_price, capacity FROM room_types WHERE hotel_id = ? ORDER BY name', [String(hotelId)]);
  const doc = new PDFDocument({ margin: 45, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="room-types.pdf"');
  doc.pipe(res);
  addHeader(doc, 'Room Types Report');
  addTable(doc, ['Name', 'Description', 'Base Price', 'Capacity'],
    types.map((t: any) => [t.name, t.description || '-', `GHS ${t.base_price}`, String(t.capacity)])
  );
  doc.end();
});

// ── Reports Summary ──
exportRouter.get('/reports/summary/csv', authenticate, (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;

  const totalRevenue = db.queryOne(
    'SELECT COALESCE(SUM(i.paid_amount),0) as total, COALESCE(SUM(i.tax_amount),0) as tax FROM invoices i WHERE i.hotel_id = ? AND i.status = ?',
    [String(hotelId), 'paid']
  );

  const totalExpenses = db.queryOne(
    'SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE hotel_id = ?',
    [String(hotelId)]
  );

  const roomCount = db.queryOne(
    'SELECT COUNT(*) as count FROM rooms WHERE hotel_id = ?',
    [String(hotelId)]
  );

  const occ = db.queryOne(`
    SELECT COALESCE(SUM(julianday(b.check_out_date) - julianday(b.check_in_date)),0) as nights_sold
    FROM bookings b WHERE b.hotel_id = ? AND b.status IN ('checked_in','checked_out')
  `, [String(hotelId)]);

  const nightsAvailable = (roomCount?.count || 1) * 365;
  const occRate = nightsAvailable > 0 ? Math.round(((occ?.nights_sold || 0) / nightsAvailable) * 100) : 0;
  const adr = (occ?.nights_sold || 0) > 0 ? Math.round((totalRevenue?.total || 0) / (occ?.nights_sold || 1)) : 0;
  const revpar = (roomCount?.count || 1) > 0 ? Math.round((totalRevenue?.total || 0) / (roomCount?.count || 1)) : 0;

  const netRevenue = (totalRevenue?.total || 0) - (totalExpenses?.total || 0);
  const margin = (totalRevenue?.total || 0) > 0 ? Math.round((netRevenue / (totalRevenue?.total || 1)) * 100) : 0;

  const summary = [{
    metric: 'Total Revenue', value: (totalRevenue?.total || 0).toFixed(2),
    metric2: 'Total Expenses', value2: (totalExpenses?.total || 0).toFixed(2),
    metric3: 'Net Profit', value3: netRevenue.toFixed(2),
    metric4: 'Profit Margin', value4: `${margin}%`,
    metric5: 'Occupancy', value5: `${occRate}%`,
    metric6: 'ADR', value6: adr.toFixed(2),
    metric7: 'RevPAR', value7: revpar.toFixed(2),
  }];

  const csv = toCSV(
    ['Metric', 'Value', 'Metric', 'Value', 'Metric', 'Value', 'Metric', 'Value'],
    summary,
    ['metric', 'value', 'metric2', 'value2', 'metric3', 'value3', 'metric4', 'value4']
  ) + '\n' + toCSV(
    ['Metric', 'Value'],
    [{ metric: 'Occupancy', value: `${occRate}%` }, { metric: 'ADR', value: adr.toFixed(2) }, { metric: 'RevPAR', value: revpar.toFixed(2) }],
    ['metric', 'value']
  );

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="report-summary.csv"');
  res.send(csv);
});

// ── Rooms ──
exportRouter.get('/rooms/csv', authenticate, (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const rooms = db.queryAll(`
    SELECT r.id, r.room_number, r.floor, r.status, rt.name as type, rt.base_price
    FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id WHERE r.hotel_id = ? ORDER BY r.room_number
  `, [String(hotelId)]);
  const csv = toCSV(
    ['ID', 'Room #', 'Floor', 'Type', 'Price/Night', 'Status'],
    rooms,
    ['id', 'room_number', 'floor', 'type', 'base_price', 'status']
  );
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="rooms.csv"');
  res.send(csv);
});

exportRouter.get('/rooms/pdf', authenticate, (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const rooms = db.queryAll(`
    SELECT r.id, r.room_number, r.floor, r.status, rt.name as type, rt.base_price
    FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id WHERE r.hotel_id = ? ORDER BY r.room_number
  `, [String(hotelId)]);
  const doc = new PDFDocument({ margin: 45, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="rooms.pdf"');
  doc.pipe(res);
  addHeader(doc, 'Rooms Report');
  addTable(doc, ['Room #', 'Floor', 'Type', 'Price/Night', 'Status'],
    rooms.map((r: any) => [r.room_number, String(r.floor), r.type, `GHS ${r.base_price}`, r.status])
  );
  doc.end();
});


