import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest, authenticate } from '../middleware/auth.js';

export const notificationsRouter = Router();
const db = getDb();

notificationsRouter.use(authenticate);

notificationsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Number(req.query.offset) || 0;
  const notifications = await db.queryAll(
    'SELECT * FROM notifications WHERE hotel_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [String(hotelId), limit, offset]
  );
  const unread = await db.queryOne(
    'SELECT COUNT(*) as count FROM notifications WHERE hotel_id = ? AND read = false',
    [String(hotelId)]
  );
  res.json({ data: notifications, unread: unread?.count || 0 });
});

notificationsRouter.put('/:id/read', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  await db.execute(
    'UPDATE notifications SET read = true WHERE id = ? AND hotel_id = ?',
    [req.params.id, String(hotelId)]
  );
  res.json({ success: true });
});

notificationsRouter.post('/read-all', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  await db.execute(
    'UPDATE notifications SET read = true WHERE hotel_id = ? AND read = false',
    [String(hotelId)]
  );
  res.json({ success: true });
});

export async function createNotification(
  hotelId: string,
  type: string,
  title: string,
  message: string,
  link: string,
  userId?: string
) {
  const id = uuid();
  await db.execute(
    'INSERT INTO notifications (id, hotel_id, user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, hotelId, userId || null, type, title, message, link]
  );
}
