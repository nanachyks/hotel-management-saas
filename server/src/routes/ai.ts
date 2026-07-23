import { Router, Response } from 'express';
import { getDb } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  getOccupancyForecast,
  getPricingSuggestions,
  getRevenueForecast,
  getSentimentAnalysis,
  getUpsellSuggestions,
  getAutoReply,
} from '../services/forecast.js';

export const aiRouter = Router();
const db = getDb();

aiRouter.get('/occupancy-forecast', (req: AuthRequest, res: Response) => {
  const days = Math.min(90, Math.max(7, parseInt(req.query.days as string) || 30));
  const result = getOccupancyForecast(req.user!.hotel_id, days);
  res.json(result);
});

aiRouter.get('/pricing-suggestions', (req: AuthRequest, res: Response) => {
  const suggestions = getPricingSuggestions(req.user!.hotel_id);
  res.json(suggestions);
});

aiRouter.get('/revenue-forecast', (req: AuthRequest, res: Response) => {
  const months = Math.min(12, Math.max(1, parseInt(req.query.months as string) || 3));
  const result = getRevenueForecast(req.user!.hotel_id, months);
  res.json(result);
});

aiRouter.get('/sentiment', (req: AuthRequest, res: Response) => {
  const result = getSentimentAnalysis(req.user!.hotel_id);
  res.json(result);
});

aiRouter.get('/upsell-suggestions', (req: AuthRequest, res: Response) => {
  const bookingId = req.query.booking_id as string | undefined;
  const result = getUpsellSuggestions(req.user!.hotel_id, bookingId);
  res.json(result);
});

aiRouter.post('/auto-reply', (req: AuthRequest, res: Response) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });
  const result = getAutoReply(message);
  res.json(result);
});

aiRouter.get('/insights', (req: AuthRequest, res: Response) => {
  const occupancy = getOccupancyForecast(req.user!.hotel_id, 30);
  const pricing = getPricingSuggestions(req.user!.hotel_id);
  const revenue = getRevenueForecast(req.user!.hotel_id, 3);
  const sentiment = getSentimentAnalysis(req.user!.hotel_id);

  const totalRooms = db.queryOne('SELECT COUNT(*) as count FROM rooms WHERE hotel_id = ?', [req.user!.hotel_id]).count;
  const lowStockCount = db.queryOne(
    'SELECT COUNT(*) as count FROM inventory_items WHERE hotel_id = ? AND min_stock > 0 AND quantity <= min_stock',
    [req.user!.hotel_id]
  ).count;

  res.json({
    occupancyForecast: occupancy,
    pricingSuggestions: pricing,
    revenueForecast: revenue,
    sentiment,
    lowStockCount,
    totalRooms,
  });
});
