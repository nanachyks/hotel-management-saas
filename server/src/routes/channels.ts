import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

export const channelsRouter = Router();

const createChannelSchema = z.object({
  channel: z.string().min(1),
  name: z.string().min(1),
  api_key: z.string().optional().default(''),
  endpoint_url: z.string().optional().default(''),
});

const updateChannelSchema = z.object({
  name: z.string().min(1).optional(),
  api_key: z.string().optional(),
  endpoint_url: z.string().optional(),
  enabled: z.boolean().optional(),
});

channelsRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const channels = await db.queryAll('SELECT * FROM channel_connections WHERE hotel_id = ? ORDER BY channel', [req.user!.hotel_id]);
    res.json(channels);
  } catch (e) { next(e); }
});

channelsRouter.post('/', validate(createChannelSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const { channel, name, api_key, endpoint_url } = req.body;
    const id = uuid();
    await db.execute('INSERT INTO channel_connections (id, hotel_id, channel, name, api_key, endpoint_url) VALUES (?, ?, ?, ?, ?, ?)',
      [id, req.user!.hotel_id, channel, name, api_key || '', endpoint_url || '']);
    res.status(201).json(await db.queryOne('SELECT * FROM channel_connections WHERE id = ?', [id]));
  } catch (e) { next(e); }
});

channelsRouter.put('/:id', validate(updateChannelSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const existing = await db.queryOne('SELECT * FROM channel_connections WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
    if (!existing) return res.status(404).json({ error: 'Connection not found' });
    const { name, api_key, endpoint_url, enabled } = req.body;
    await db.execute("UPDATE channel_connections SET name = ?, api_key = ?, endpoint_url = ?, enabled = ? WHERE id = ? AND hotel_id = ?",
      [name ?? existing.name, api_key ?? existing.api_key, endpoint_url ?? existing.endpoint_url, enabled !== undefined ? !!enabled : existing.enabled, req.params.id, req.user!.hotel_id]);
    res.json(await db.queryOne('SELECT * FROM channel_connections WHERE id = ?', [req.params.id]));
  } catch (e) { next(e); }
});

channelsRouter.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const existing = await db.queryOne('SELECT * FROM channel_connections WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
    if (!existing) return res.status(404).json({ error: 'Connection not found' });
    await db.execute('DELETE FROM channel_connections WHERE id = ?', [req.params.id]);
    res.json({ message: 'Connection removed' });
  } catch (e) { next(e); }
});

channelsRouter.post('/:id/sync', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const existing = await db.queryOne('SELECT * FROM channel_connections WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
    if (!existing) return res.status(404).json({ error: 'Connection not found' });

    const rooms = await db.queryAll('SELECT r.id, r.room_number, r.status, rt.name as type, rt.base_price FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id WHERE r.hotel_id = ?', [req.user!.hotel_id]);
    const availability = rooms.map((r: any) => ({
      roomId: r.id, roomNumber: r.room_number, type: r.type, price: r.base_price,
      available: r.status === 'available' || r.status === 'reserved',
    }));

    await db.execute("UPDATE channel_connections SET last_sync_at = NOW() WHERE id = ?", [req.params.id]);
    res.json({ message: 'Synced', channel: existing.channel, roomsSynced: rooms.length, availability });
  } catch (e) { next(e); }
});

channelsRouter.get('/availability', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const rooms = await db.queryAll('SELECT r.id, r.room_number, r.status, rt.name as type, rt.base_price FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id WHERE r.hotel_id = ?', [req.user!.hotel_id]);
    const available = rooms.filter((r: any) => r.status === 'available' || r.status === 'reserved').length;
    res.json({ total: rooms.length, available, rooms });
  } catch (e) { next(e); }
});
