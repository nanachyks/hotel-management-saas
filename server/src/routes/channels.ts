import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export const channelsRouter = Router();
const db = getDb();

channelsRouter.get('/', (req: AuthRequest, res: Response) => {
  const channels = db.queryAll('SELECT * FROM channel_connections WHERE hotel_id = ? ORDER BY channel', [req.user!.hotel_id]);
  res.json(channels);
});

channelsRouter.post('/', (req: AuthRequest, res: Response) => {
  const { channel, name, api_key, endpoint_url } = req.body;
  if (!channel || !name) return res.status(400).json({ error: 'channel and name required' });
  const id = uuid();
  db.execute('INSERT INTO channel_connections (id, hotel_id, channel, name, api_key, endpoint_url) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.user!.hotel_id, channel, name, api_key || '', endpoint_url || '']);
  res.status(201).json(db.queryOne('SELECT * FROM channel_connections WHERE id = ?', [id]));
});

channelsRouter.put('/:id', (req: AuthRequest, res: Response) => {
  const existing = db.queryOne('SELECT * FROM channel_connections WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Connection not found' });
  const { name, api_key, endpoint_url, enabled } = req.body;
  db.execute("UPDATE channel_connections SET name = ?, api_key = ?, endpoint_url = ?, enabled = ? WHERE id = ? AND hotel_id = ?",
    [name ?? existing.name, api_key ?? existing.api_key, endpoint_url ?? existing.endpoint_url, enabled !== undefined ? (enabled ? 1 : 0) : existing.enabled, req.params.id, req.user!.hotel_id]);
  res.json(db.queryOne('SELECT * FROM channel_connections WHERE id = ?', [req.params.id]));
});

channelsRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  const existing = db.queryOne('SELECT * FROM channel_connections WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Connection not found' });
  db.execute('DELETE FROM channel_connections WHERE id = ?', [req.params.id]);
  res.json({ message: 'Connection removed' });
});

channelsRouter.post('/:id/sync', (req: AuthRequest, res: Response) => {
  const existing = db.queryOne('SELECT * FROM channel_connections WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Connection not found' });

  const rooms = db.queryAll('SELECT r.id, r.room_number, r.status, rt.name as type, rt.base_price FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id WHERE r.hotel_id = ?', [req.user!.hotel_id]);
  const today = new Date().toISOString().split('T')[0];
  const availability = rooms.map((r: any) => ({
    roomId: r.id, roomNumber: r.room_number, type: r.type, price: r.base_price,
    available: r.status === 'available' || r.status === 'reserved',
  }));

  db.execute("UPDATE channel_connections SET last_sync_at = datetime('now') WHERE id = ?", [req.params.id]);
  res.json({ message: 'Synced', channel: existing.channel, roomsSynced: rooms.length, availability });
});

channelsRouter.get('/availability', (req: AuthRequest, res: Response) => {
  const rooms = db.queryAll('SELECT r.id, r.room_number, r.status, rt.name as type, rt.base_price FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id WHERE r.hotel_id = ?', [req.user!.hotel_id]);
  const available = rooms.filter((r: any) => r.status === 'available' || r.status === 'reserved').length;
  res.json({ total: rooms.length, available, rooms });
});
