import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest } from '../middleware/auth.js';

export const integrationsRouter = Router();
const db = getDb();

const PROVIDERS: Record<string, string[]> = {
  channel_manager: ['bookingdotcom', 'expedia', 'airbnb', 'direct'],
  payment_gateway: ['paystack', 'stripe', 'flutterwave', 'interswitch', 'square'],
  pos: ['square', 'vend', 'lightspeed', 'clover', 'shopify_pos'],
  accounting: ['quickbooks', 'xero', 'freshbooks', 'sage', 'wave'],
  door_lock: ['assa_abloy', 'salto', 'onity', 'dormakaba', 'miwa'],
  key_card: ['kaba', 'saflok', 'vingcard', 'ils', 'tesa'],
};

integrationsRouter.get('/', (req: AuthRequest, res: Response) => {
  const { type } = req.query;
  let query = 'SELECT * FROM integrations WHERE hotel_id = ?';
  const params: string[] = [req.user!.hotel_id];
  if (type) { query += ' AND type = ?'; params.push(type as string); }
  query += ' ORDER BY type, provider';
  res.json(db.queryAll(query, params));
});

integrationsRouter.get('/providers/:type', (req: AuthRequest, res: Response) => {
  const providers = PROVIDERS[req.params.type] || [];
  const connected = db.queryAll(
    'SELECT provider FROM integrations WHERE hotel_id = ? AND type = ?',
    [req.user!.hotel_id, req.params.type]
  ).map((r: any) => r.provider);
  res.json({ type: req.params.type, available: providers.filter((p: string) => !connected.includes(p)), connected });
});

integrationsRouter.post('/', (req: AuthRequest, res: Response) => {
  const { type, provider, name, api_key, api_secret, endpoint_url, credentials } = req.body;
  if (!type || !provider || !name) return res.status(400).json({ error: 'type, provider, and name are required' });
  if (!PROVIDERS[type]?.includes(provider)) return res.status(400).json({ error: `Invalid provider '${provider}' for type '${type}'` });

  const existing = db.queryOne('SELECT id FROM integrations WHERE hotel_id = ? AND type = ? AND provider = ?', [req.user!.hotel_id, type, provider]);
  if (existing) return res.status(409).json({ error: `${provider} ${type} already configured` });

  const id = uuid();
  db.execute(
    'INSERT INTO integrations (id, hotel_id, type, provider, name, api_key, api_secret, endpoint_url, credentials) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.user!.hotel_id, type, provider, name, api_key || '', api_secret || '', endpoint_url || '', credentials ? JSON.stringify(credentials) : '{}']
  );
  res.status(201).json(db.queryOne('SELECT * FROM integrations WHERE id = ?', [id]));
});

integrationsRouter.put('/:id', (req: AuthRequest, res: Response) => {
  const existing = db.queryOne('SELECT * FROM integrations WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Integration not found' });
  const { name, api_key, api_secret, endpoint_url, credentials, enabled } = req.body;
  db.execute(
    "UPDATE integrations SET name = ?, api_key = ?, api_secret = ?, endpoint_url = ?, credentials = ?, enabled = ? WHERE id = ? AND hotel_id = ?",
    [name ?? existing.name, api_key ?? existing.api_key, api_secret ?? existing.api_secret,
     endpoint_url ?? existing.endpoint_url, credentials ? JSON.stringify(credentials) : existing.credentials,
     enabled !== undefined ? (enabled ? 1 : 0) : existing.enabled, req.params.id, req.user!.hotel_id]
  );
  res.json(db.queryOne('SELECT * FROM integrations WHERE id = ?', [req.params.id]));
});

integrationsRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  const existing = db.queryOne('SELECT * FROM integrations WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!existing) return res.status(404).json({ error: 'Integration not found' });
  db.execute('DELETE FROM integrations WHERE id = ?', [req.params.id]);
  res.json({ message: 'Integration removed' });
});

integrationsRouter.post('/:id/sync', (req: AuthRequest, res: Response) => {
  const integration = db.queryOne('SELECT * FROM integrations WHERE id = ? AND hotel_id = ?', [req.params.id, req.user!.hotel_id]);
  if (!integration) return res.status(404).json({ error: 'Integration not found' });

  let result: any = { message: 'Synced', provider: integration.provider, type: integration.type };

  if (integration.type === 'channel_manager') {
    const rooms = db.queryAll('SELECT r.id, r.room_number, r.status, rt.name as type, rt.base_price FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id WHERE r.hotel_id = ?', [req.user!.hotel_id]);
    result.roomsSynced = rooms.length;
    result.availability = rooms.map((r: any) => ({ roomId: r.id, number: r.room_number, type: r.type, price: r.base_price, available: r.status === 'available' || r.status === 'reserved' }));
  } else if (integration.type === 'payment_gateway') {
    const recentPayments = db.queryAll("SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM payments WHERE created_at >= datetime('now', '-30 days')", []);
    result.recentPayments = recentPayments[0];
  } else if (integration.type === 'accounting') {
    const invoices = db.queryAll("SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM invoices WHERE hotel_id = ? AND status IN ('paid','partial')", [req.user!.hotel_id]);
    result.exportReady = invoices[0];
  } else if (integration.type === 'pos') {
    const services = db.queryAll('SELECT COUNT(*) as count FROM services WHERE hotel_id = ?', [req.user!.hotel_id]);
    result.menuItems = services[0]?.count || 0;
  } else if (integration.type === 'door_lock' || integration.type === 'key_card') {
    const rooms = db.queryAll('SELECT COUNT(*) as count FROM rooms WHERE hotel_id = ?', [req.user!.hotel_id]);
    result.rooms = rooms[0]?.count || 0;
  }

  db.execute("UPDATE integrations SET last_sync_at = datetime('now') WHERE id = ?", [req.params.id]);
  res.json(result);
});
