import { Router, Response } from 'express';
import { getDb } from '../db.js';
import { AuthRequest, authenticate, requireRole } from '../middleware/auth.js';

export const currenciesRouter = Router();
const db = getDb();

currenciesRouter.use(authenticate);

currenciesRouter.get('/', async (_req: AuthRequest, res: Response) => {
  const currencies = await db.queryAll('SELECT * FROM currencies ORDER BY code ASC');
  res.json(currencies);
});

currenciesRouter.get('/rates', async (req: AuthRequest, res: Response) => {
  const rates = await db.queryAll('SELECT * FROM exchange_rates ORDER BY from_currency, to_currency');
  res.json(rates);
});

// These write global, platform-wide reference data shared by every tenant —
// restrict to admin/owner rather than any authenticated user.
currenciesRouter.put('/rates', requireRole('admin', 'owner'), async (req: AuthRequest, res: Response) => {
  const { rates } = req.body;
  if (!Array.isArray(rates)) return res.status(400).json({ error: 'rates array required' });

  for (const r of rates) {
    const existing = await db.queryOne('SELECT id FROM exchange_rates WHERE from_currency = ? AND to_currency = ?', [r.from, r.to]);
    if (existing) {
      await db.execute("UPDATE exchange_rates SET rate = ?, updated_at = NOW() WHERE from_currency = ? AND to_currency = ?", [r.rate, r.from, r.to]);
    } else {
      await db.execute('INSERT INTO exchange_rates (from_currency, to_currency, rate) VALUES (?, ?, ?)', [r.from, r.to, r.rate]);
    }
  }
  res.json({ message: 'Exchange rates updated' });
});

currenciesRouter.post('/seed', requireRole('admin', 'owner'), async (req: AuthRequest, res: Response) => {
  const initial = [
    { code: 'GHS', name: 'Ghana Cedi', symbol: 'GHs' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
  ];
  for (const c of initial) {
    await db.execute('INSERT INTO currencies (code, name, symbol) VALUES (?, ?, ?) ON CONFLICT (code) DO NOTHING', [c.code, c.name, c.symbol]);
  }
  const baseRates = [
    { from: 'USD', to: 'GHS', rate: 15.50 },
    { from: 'USD', to: 'NGN', rate: 1550 },
    { from: 'USD', to: 'EUR', rate: 0.92 },
    { from: 'USD', to: 'GBP', rate: 0.79 },
    { from: 'GHS', to: 'USD', rate: 0.065 },
    { from: 'GHS', to: 'NGN', rate: 100 },
    { from: 'GHS', to: 'EUR', rate: 0.059 },
    { from: 'GHS', to: 'GBP', rate: 0.051 },
    { from: 'GHS', to: 'GHS', rate: 1 },
    { from: 'USD', to: 'USD', rate: 1 },
    { from: 'NGN', to: 'NGN', rate: 1 },
    { from: 'EUR', to: 'EUR', rate: 1 },
    { from: 'GBP', to: 'GBP', rate: 1 },
  ];
  for (const r of baseRates) {
    await db.execute('INSERT INTO exchange_rates (from_currency, to_currency, rate) VALUES (?, ?, ?) ON CONFLICT (from_currency, to_currency) DO NOTHING', [r.from, r.to, r.rate]);
  }
  const currencies = await db.queryAll('SELECT * FROM currencies ORDER BY code');
  res.json({ message: 'Currencies seeded', currencies });
});
