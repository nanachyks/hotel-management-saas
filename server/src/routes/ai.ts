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

aiRouter.get('/occupancy-forecast', async (req: AuthRequest, res: Response) => {
  const days = Math.min(90, Math.max(7, parseInt(req.query.days as string) || 30));
  const result = await getOccupancyForecast(req.user!.hotel_id, days);
  res.json(result);
});

aiRouter.get('/pricing-suggestions', async (req: AuthRequest, res: Response) => {
  const suggestions = await getPricingSuggestions(req.user!.hotel_id);
  res.json(suggestions);
});

aiRouter.get('/revenue-forecast', async (req: AuthRequest, res: Response) => {
  const months = Math.min(12, Math.max(1, parseInt(req.query.months as string) || 3));
  const result = await getRevenueForecast(req.user!.hotel_id, months);
  res.json(result);
});

aiRouter.get('/sentiment', async (req: AuthRequest, res: Response) => {
  const result = await getSentimentAnalysis(req.user!.hotel_id);
  res.json(result);
});

aiRouter.get('/upsell-suggestions', async (req: AuthRequest, res: Response) => {
  const bookingId = req.query.booking_id as string | undefined;
  const result = await getUpsellSuggestions(req.user!.hotel_id, bookingId);
  res.json(result);
});

aiRouter.post('/auto-reply', (req: AuthRequest, res: Response) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });
  const result = getAutoReply(message);
  res.json(result);
});

aiRouter.get('/insights', async (req: AuthRequest, res: Response) => {
  const occupancy = await getOccupancyForecast(req.user!.hotel_id, 30);
  const pricing = await getPricingSuggestions(req.user!.hotel_id);
  const revenue = await getRevenueForecast(req.user!.hotel_id, 3);
  const sentiment = await getSentimentAnalysis(req.user!.hotel_id);

  const totalRooms = (await db.queryOne('SELECT COUNT(*) as count FROM rooms WHERE hotel_id = ?', [req.user!.hotel_id])).count;
  const lowStockCount = (await db.queryOne(
    'SELECT COUNT(*) as count FROM inventory_items WHERE hotel_id = ? AND min_stock > 0 AND quantity <= min_stock',
    [req.user!.hotel_id]
  )).count;

  res.json({
    occupancyForecast: occupancy,
    pricingSuggestions: pricing,
    revenueForecast: revenue,
    sentiment,
    lowStockCount,
    totalRooms,
  });
});
