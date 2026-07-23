import { Router, Response } from 'express';
import { getDb } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export const reportsRouter = Router();
const db = getDb();

reportsRouter.get('/summary', (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;

  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStr = monthStart.toISOString().split('T')[0];

  // Total rooms
  const totalRooms = db.queryOne('SELECT COUNT(*) as count FROM rooms WHERE hotel_id = ?', [String(hotelId)]);

  // Daily sales
  const dailySales = db.queryOne(`
    SELECT COALESCE(SUM(i.amount), 0) as total, COALESCE(SUM(i.tax_amount), 0) as tax
    FROM invoices i JOIN bookings b ON i.booking_id = b.id
    WHERE i.hotel_id = ? AND b.check_out_date = ? AND i.status IN ('paid', 'partial')
  `, [String(hotelId), today]);

  // Monthly sales
  const monthlySales = db.queryOne(`
    SELECT COALESCE(SUM(i.amount), 0) as total, COALESCE(SUM(i.tax_amount), 0) as tax
    FROM invoices i JOIN bookings b ON i.booking_id = b.id
    WHERE i.hotel_id = ? AND b.check_out_date >= ? AND i.status IN ('paid', 'partial')
  `, [String(hotelId), monthStr]);

  // Total revenue (all time paid)
  const totalRevenue = db.queryOne(`
    SELECT COALESCE(SUM(i.amount), 0) as total, COALESCE(SUM(i.tax_amount), 0) as tax
    FROM invoices i WHERE i.hotel_id = ? AND i.status IN ('paid', 'partial')
  `, [String(hotelId)]);

  // Total expenses
  const totalExpenses = db.queryOne(
    'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE hotel_id = ?',
    [String(hotelId)]
  );

  // Pending invoices
  const pendingInvoices = db.queryOne(
    "SELECT COUNT(*) as count, COALESCE(SUM(amount - paid_amount), 0) as total FROM invoices WHERE hotel_id = ? AND status IN ('pending', 'partial')",
    [String(hotelId)]
  );

  // --- OCCUPANCY ---
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const totalRoomNights = (totalRooms?.count || 0) * daysInMonth;

  const occupiedNightsMonth = db.queryOne(`
    SELECT COALESCE(SUM(julianday(check_out_date) - julianday(check_in_date)), 0) as nights
    FROM bookings
    WHERE hotel_id = ? AND status IN ('checked_in', 'checked_out')
      AND check_out_date >= ? AND check_in_date <= date('now', 'start of month', '+1 month', '-1 day')
  `, [String(hotelId), monthStr]);

  const occupancyRate = totalRoomNights > 0
    ? Math.round((Number(occupiedNightsMonth?.nights || 0) / totalRoomNights) * 100)
    : 0;

  // Monthly occupancy trend (last 12 months)
  const monthlyOccupancy = db.queryAll(`
    SELECT strftime('%Y-%m', b.check_out_date) as month,
      COUNT(DISTINCT b.id) as bookings_count,
      COALESCE(SUM(julianday(b.check_out_date) - julianday(b.check_in_date)), 0) as nights_sold
    FROM bookings b
    WHERE b.hotel_id = ? AND b.status IN ('checked_in', 'checked_out')
      AND b.check_out_date >= date('now', '-12 months')
    GROUP BY month ORDER BY month ASC
  `, [String(hotelId)]);

  const roomCount = totalRooms?.count || 0;
  const monthlyOccupancyTrend = monthlyOccupancy.map((m: any) => {
    const [y, mo] = m.month.split('-');
    const daysM = new Date(Number(y), Number(mo), 0).getDate();
    const available = roomCount * daysM;
    return {
      month: m.month,
      rate: available > 0 ? Math.round((Number(m.nights_sold) / available) * 100) : 0,
      nightsSold: Number(m.nights_sold),
      nightsAvailable: available,
    };
  });

  // --- ADR (Average Daily Rate) ---
  const adrData = db.queryOne(`
    SELECT COALESCE(SUM(p.amount), 0) as room_revenue,
      COALESCE(SUM(julianday(b.check_out_date) - julianday(b.check_in_date)), 0) as room_nights
    FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    JOIN bookings b ON i.booking_id = b.id
    WHERE i.hotel_id = ? AND i.status IN ('paid', 'partial')
  `, [String(hotelId)]);

  const totalRoomRevenue = Number(adrData?.room_revenue || 0);
  const totalRoomNightsSold = Number(adrData?.room_nights || 0);
  const adr = totalRoomNightsSold > 0 ? totalRoomRevenue / totalRoomNightsSold : 0;
  const revpar = totalRoomNights > 0 ? totalRoomRevenue / totalRoomNights : 0;

  // Monthly ADR & RevPAR trend
  const monthlyAdrRevpar = db.queryAll(`
    SELECT strftime('%Y-%m', b.check_out_date) as month,
      COALESCE(SUM(p.amount), 0) as room_revenue,
      COALESCE(SUM(julianday(b.check_out_date) - julianday(b.check_in_date)), 0) as room_nights
    FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    JOIN bookings b ON i.booking_id = b.id
    WHERE i.hotel_id = ? AND i.status IN ('paid', 'partial')
      AND b.check_out_date >= date('now', '-12 months')
    GROUP BY month ORDER BY month ASC
  `, [String(hotelId)]);

  const adrRevparTrend = monthlyAdrRevpar.map((m: any) => {
    const nights = Number(m.room_nights);
    const revenue = Number(m.room_revenue);
    const [y, mo] = m.month.split('-');
    const daysM = new Date(Number(y), Number(mo), 0).getDate();
    const available = roomCount * daysM;
    return {
      month: m.month,
      adr: nights > 0 ? Math.round((revenue / nights) * 100) / 100 : 0,
      revpar: available > 0 ? Math.round((revenue / available) * 100) / 100 : 0,
      revenue,
      nightsSold: nights,
    };
  });

  // Revenue by month (last 12)
  const monthlyRevenue = db.queryAll(`
    SELECT strftime('%Y-%m', b.check_out_date) as month,
      COALESCE(SUM(i.amount), 0) as revenue,
      COALESCE(SUM(i.tax_amount), 0) as tax,
      COUNT(DISTINCT i.id) as invoice_count
    FROM invoices i JOIN bookings b ON i.booking_id = b.id
    WHERE i.hotel_id = ? AND i.status IN ('paid', 'partial') AND b.check_out_date >= date('now', '-12 months')
    GROUP BY month ORDER BY month ASC
  `, [String(hotelId)]);

  // Revenue by payment method
  const paymentsByMethod = db.queryAll(`
    SELECT p.method, COALESCE(SUM(p.amount), 0) as total, COUNT(*) as count
    FROM payments p JOIN invoices i ON p.invoice_id = i.id
    WHERE i.hotel_id = ? AND p.amount > 0
    GROUP BY p.method ORDER BY total DESC
  `, [String(hotelId)]);

  // Expenses by category
  const expensesByCategory = db.queryAll(`
    SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM expenses WHERE hotel_id = ?
    GROUP BY category ORDER BY total DESC
  `, [String(hotelId)]);

  // Tax collected by month
  const taxByMonth = db.queryAll(`
    SELECT strftime('%Y-%m', b.check_out_date) as month, COALESCE(SUM(i.tax_amount), 0) as tax
    FROM invoices i JOIN bookings b ON i.booking_id = b.id
    WHERE i.hotel_id = ? AND i.status IN ('paid', 'partial') AND b.check_out_date >= date('now', '-12 months')
    GROUP BY month ORDER BY month ASC
  `, [String(hotelId)]);

  // --- GUEST DEMOGRAPHICS ---
  // Bookings by source
  const bookingsBySource = db.queryAll(`
    SELECT source, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue
    FROM bookings WHERE hotel_id = ?
    GROUP BY source ORDER BY count DESC
  `, [String(hotelId)]);

  // Average length of stay
  const avgStay = db.queryOne(`
    SELECT COALESCE(AVG(julianday(check_out_date) - julianday(check_in_date)), 0) as avg_nights
    FROM bookings WHERE hotel_id = ? AND status IN ('checked_in', 'checked_out', 'confirmed')
  `, [String(hotelId)]);

  // Repeat guests (guests with more than 1 booking)
  const repeatGuests = db.queryAll(`
    SELECT COUNT(*) as guest_count FROM (
      SELECT guest_id, COUNT(*) as booking_count
      FROM bookings WHERE hotel_id = ?
      GROUP BY guest_id HAVING booking_count > 1
    )
  `, [String(hotelId)]);

  const totalGuests = db.queryOne(
    'SELECT COUNT(*) as count FROM (SELECT DISTINCT guest_id FROM bookings WHERE hotel_id = ?)',
    [String(hotelId)]
  );

  const totalDistinctGuests = totalGuests?.count || 0;
  const repeatGuestCount = repeatGuests[0]?.guest_count || 0;
  const newGuestCount = totalDistinctGuests - repeatGuestCount;

  // Monthly booking count trend
  const bookingTrend = db.queryAll(`
    SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
    FROM bookings WHERE hotel_id = ? AND created_at >= date('now', '-12 months')
    GROUP BY month ORDER BY month ASC
  `, [String(hotelId)]);

  // Top guests by total spend
  const topGuests = db.queryAll(`
    SELECT g.id, g.first_name || ' ' || g.last_name as guest_name, g.email,
      COUNT(b.id) as booking_count,
      COALESCE(SUM(b.total_amount), 0) as total_spent
    FROM guests g
    JOIN bookings b ON b.guest_id = g.id
    WHERE g.hotel_id = ? AND b.status IN ('checked_in', 'checked_out')
    GROUP BY g.id
    ORDER BY total_spent DESC
    LIMIT 10
  `, [String(hotelId)]);

  res.json({
    dailySales: { total: dailySales?.total || 0, tax: dailySales?.tax || 0, date: today },
    monthlySales: { total: monthlySales?.total || 0, tax: monthlySales?.tax || 0, month: monthStr },
    totalRevenue: { total: totalRevenue?.total || 0, tax: totalRevenue?.tax || 0 },
    totalExpenses: totalExpenses?.total || 0,
    netRevenue: (totalRevenue?.total || 0) - (totalExpenses?.total || 0),
    pendingInvoices,
    monthlyRevenue,
    paymentsByMethod,
    expensesByCategory,
    taxByMonth,
    occupancy: {
      currentRate: occupancyRate,
      totalRooms: roomCount,
      nightsSold: Number(occupiedNightsMonth?.nights || 0),
      nightsAvailable: totalRoomNights,
      monthlyTrend: monthlyOccupancyTrend,
    },
    adr: Math.round(adr * 100) / 100,
    revpar: Math.round(revpar * 100) / 100,
    adrRevparTrend,
    guestDemographics: {
      bookingsBySource,
      avgLengthOfStay: Math.round(Number(avgStay?.avg_nights || 0) * 100) / 100,
      repeatGuests: repeatGuestCount,
      newGuests: newGuestCount,
      totalGuests: totalDistinctGuests,
      bookingTrend,
      topGuests,
    },
  });
});
