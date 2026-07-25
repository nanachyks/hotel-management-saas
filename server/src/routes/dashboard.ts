import { Router, Response } from 'express';
import { getDb } from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

export const dashboardRouter = Router();
const db = getDb();

dashboardRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;

  const totalRooms = (await db.queryOne('SELECT COUNT(*) as count FROM rooms WHERE hotel_id = ?', [String(hotelId)])).count;
  const availableRooms = (await db.queryOne("SELECT COUNT(*) as count FROM rooms WHERE status = 'available' AND hotel_id = ?", [String(hotelId)])).count;
  const occupiedRooms = (await db.queryOne("SELECT COUNT(*) as count FROM rooms WHERE status = 'occupied' AND hotel_id = ?", [String(hotelId)])).count;
  const maintenanceRooms = (await db.queryOne("SELECT COUNT(*) as count FROM rooms WHERE status = 'maintenance' AND hotel_id = ?", [String(hotelId)])).count;

  const today = new Date().toISOString().split('T')[0];
  const checkInsToday = (await db.queryOne(
    "SELECT COUNT(*) as count FROM bookings WHERE check_in_date = ? AND status IN ('confirmed', 'checked_in') AND hotel_id = ?",
    [today, String(hotelId)]
  )).count;
  const checkOutsToday = (await db.queryOne(
    "SELECT COUNT(*) as count FROM bookings WHERE check_out_date = ? AND status IN ('checked_in', 'confirmed') AND hotel_id = ?",
    [today, String(hotelId)]
  )).count;
  const activeBookings = (await db.queryOne(
    "SELECT COUNT(*) as count FROM bookings WHERE status IN ('confirmed', 'checked_in') AND hotel_id = ?",
    [String(hotelId)]
  )).count;
  const totalRevenue = (await db.queryOne("SELECT COALESCE(SUM(total_amount), 0) as total FROM bookings WHERE status = 'checked_out' AND hotel_id = ?", [String(hotelId)])).total;
  const totalExpenses = (await db.queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE hotel_id = ?", [String(hotelId)])).total;
  const pendingPayments = (await db.queryOne("SELECT COALESCE(SUM(amount - paid_amount), 0) as total FROM invoices WHERE status IN ('pending', 'partial') AND hotel_id = ?", [String(hotelId)])).total;

  const recentBookings = await db.queryAll(`
    SELECT b.*, g.first_name || ' ' || g.last_name as guest_name, r.room_number
    FROM bookings b
    JOIN guests g ON b.guest_id = g.id
    JOIN rooms r ON b.room_id = r.id
    WHERE b.hotel_id = ?
    ORDER BY b.created_at DESC LIMIT 5
  `, [String(hotelId)]);

  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // Chart data: revenue trend (last 6 months)
  const revenueTrend = await db.queryAll(`
    SELECT TO_CHAR(check_out_date::date, 'YYYY-MM') as month, COALESCE(SUM(total_amount), 0) as revenue
    FROM bookings WHERE status = 'checked_out' AND check_out_date >= TO_CHAR(NOW() - INTERVAL '6 months', 'YYYY-MM-DD') AND hotel_id = ?
    GROUP BY month ORDER BY month ASC
  `, [String(hotelId)]);

  // Chart data: booking trend (last 6 months)
  const bookingTrend = await db.queryAll(`
    SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
    FROM bookings WHERE created_at >= NOW() - INTERVAL '6 months' AND hotel_id = ?
    GROUP BY month ORDER BY month ASC
  `, [String(hotelId)]);

  // Chart data: room status distribution
  const roomStatus = await db.queryAll(`
    SELECT status, COUNT(*) as count FROM rooms WHERE hotel_id = ? GROUP BY status
  `, [String(hotelId)]);

  // Chart data: monthly occupancy (last 6 months)
  const monthlyOccupancy = await db.queryAll(`
    SELECT TO_CHAR(b.check_out_date::date, 'YYYY-MM') as month,
      ROUND(AVG(CASE WHEN r.status = 'occupied' THEN 1.0 ELSE 0.0 END) * 100, 0) as rate
    FROM bookings b JOIN rooms r ON b.room_id = r.id
    WHERE b.status = 'checked_out' AND b.check_out_date >= TO_CHAR(NOW() - INTERVAL '6 months', 'YYYY-MM-DD') AND b.hotel_id = ?
    GROUP BY month ORDER BY month ASC
  `, [String(hotelId)]);

  const taxCollected = (await db.queryOne("SELECT COALESCE(SUM(tax_amount), 0) as total FROM invoices WHERE hotel_id = ? AND status IN ('paid', 'partial')", [String(hotelId)])).total;

  res.json({
    totalRooms, availableRooms, occupiedRooms, maintenanceRooms, occupancyRate,
    checkInsToday, checkOutsToday, activeBookings, totalRevenue, totalExpenses, taxCollected, pendingPayments, recentBookings,
    charts: { revenueTrend, bookingTrend, roomStatus, monthlyOccupancy },
  });
});
