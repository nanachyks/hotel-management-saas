import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { AuthRequest, authenticate } from '../middleware/auth.js';
import { initializeTransaction, verifyTransaction, isConfigured } from '../services/paystack.js';

export const subscriptionsRouter = Router();
const db = getDb();

subscriptionsRouter.use(authenticate);

subscriptionsRouter.get('/plans', (_req: AuthRequest, res: Response) => {
  const plans = db.queryAll(
    'SELECT * FROM subscription_plans ORDER BY sort_order ASC'
  );
  res.json({ data: plans });
});

subscriptionsRouter.get('/', (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const sub = db.queryOne(`
    SELECT hs.*, sp.name as plan_name, sp.slug as plan_slug, sp.description as plan_description,
      sp.price_monthly, sp.price_yearly, sp.max_rooms, sp.max_users, sp.features, sp.highlighted
    FROM hotel_subscriptions hs
    JOIN subscription_plans sp ON hs.plan_id = sp.id
    WHERE hs.hotel_id = ?
  `, [String(hotelId)]);

  if (!sub) {
    const freePlan = db.queryOne("SELECT * FROM subscription_plans WHERE slug = 'free_trial' ORDER BY sort_order ASC LIMIT 1");
    return res.json({ data: null, defaultPlan: freePlan || null });
  }

  const usage = db.queryOne(`
    SELECT
      (SELECT COUNT(*) FROM rooms WHERE hotel_id = ?) as room_count,
      (SELECT COUNT(*) FROM users WHERE hotel_id = ?) as user_count
  `, [String(hotelId), String(hotelId)]);

  res.json({ data: { ...sub, usage } });
});

// Direct subscribe — only for free plans
subscriptionsRouter.post('/', (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const { plan_id, billing_interval } = req.body;

  if (!plan_id) {
    res.status(400).json({ error: 'plan_id is required' });
    return;
  }

  const plan = db.queryOne('SELECT * FROM subscription_plans WHERE id = ?', [plan_id]);
  if (!plan) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  const interval = billing_interval === 'yearly' ? 'yearly' : 'monthly';
  const price = interval === 'yearly' ? plan.price_yearly : plan.price_monthly;

  if (price > 0) {
    res.status(400).json({ error: 'Paid plans require payment. Use /subscriptions/initialize-payment instead.' });
    return;
  }

  const existing = db.queryOne('SELECT id FROM hotel_subscriptions WHERE hotel_id = ?', [String(hotelId)]);
  const periodEnd = new Date();
  interval === 'yearly' ? periodEnd.setFullYear(periodEnd.getFullYear() + 1) : periodEnd.setMonth(periodEnd.getMonth() + 1);

  if (existing) {
    db.execute(
      `UPDATE hotel_subscriptions SET plan_id = ?, billing_interval = ?, status = 'active', current_period_ends_at = ?, updated_at = datetime('now') WHERE hotel_id = ?`,
      [plan_id, interval, periodEnd.toISOString().split('T')[0], String(hotelId)]
    );
  } else {
    db.execute(
      `INSERT INTO hotel_subscriptions (id, hotel_id, plan_id, billing_interval, status, current_period_starts_at, current_period_ends_at)
       VALUES (?, ?, ?, ?, 'active', datetime('now'), ?)`,
      [uuid(), String(hotelId), plan_id, interval, periodEnd.toISOString().split('T')[0]]
    );
  }

  res.json({ success: true, message: `Subscribed to ${plan.name}`, price: 0 });
});

// Initialize Paystack payment for paid plans
subscriptionsRouter.post('/initialize-payment', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const userEmail = req.user?.email;
  const { plan_id, billing_interval } = req.body;

  if (!plan_id) {
    res.status(400).json({ error: 'plan_id is required' });
    return;
  }

  if (!isConfigured()) {
    res.status(500).json({ error: 'Payment gateway not configured. Set PAYSTACK_SECRET_KEY in server/.env' });
    return;
  }

  const plan = db.queryOne('SELECT * FROM subscription_plans WHERE id = ?', [plan_id]);
  if (!plan) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  if (plan.price_monthly === 0) {
    res.status(400).json({ error: 'Free plans do not require payment. Use POST /subscriptions instead.' });
    return;
  }

  const interval = billing_interval === 'yearly' ? 'yearly' : 'monthly';
  const amount = interval === 'yearly' ? plan.price_yearly : plan.price_monthly;

  // Store as pesewas (GHS * 100)
  const amountInPesewas = Math.round(amount * 100);

  const origin = req.headers.origin || `http://localhost:5173`;
  const callbackUrl = `${origin}/payment-callback`;

  try {
    const result = await initializeTransaction({
      email: userEmail || 'guest@hotelease.com',
      amount: amountInPesewas,
      callback_url: callbackUrl,
      metadata: {
        hotel_id: hotelId,
        plan_id,
        billing_interval: interval,
        plan_name: plan.name,
      },
    });

    // Store payment record
    const paymentId = uuid();
    db.execute(
      `INSERT INTO subscription_payments (id, hotel_id, plan_id, amount, currency, billing_interval, paystack_reference, paystack_access_code, status)
       VALUES (?, ?, ?, ?, 'GHS', ?, ?, ?, 'pending')`,
      [paymentId, String(hotelId), plan_id, amount, interval, result.reference, result.access_code]
    );

    res.json({
      authorization_url: result.authorization_url,
      reference: result.reference,
      access_code: result.access_code,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Payment initialization failed' });
  }
});

// Verify Paystack payment (called after redirect from Paystack)
subscriptionsRouter.post('/verify-payment', async (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const { reference } = req.body;

  if (!reference) {
    res.status(400).json({ error: 'reference is required' });
    return;
  }

  try {
    const verification = await verifyTransaction(reference);
    const payment = db.queryOne(
      'SELECT * FROM subscription_payments WHERE paystack_reference = ?',
      [reference]
    );

    if (!payment) {
      res.status(404).json({ error: 'Payment record not found' });
      return;
    }

    if (verification.status === 'success') {
      // Activate subscription
      const periodEnd = new Date();
      if (payment.billing_interval === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const existing = db.queryOne('SELECT id FROM hotel_subscriptions WHERE hotel_id = ?', [String(hotelId)]);
      if (existing) {
        db.execute(
          `UPDATE hotel_subscriptions SET plan_id = ?, billing_interval = ?, status = 'active', current_period_ends_at = ?, updated_at = datetime('now') WHERE hotel_id = ?`,
          [payment.plan_id, payment.billing_interval, periodEnd.toISOString().split('T')[0], String(hotelId)]
        );
      } else {
        db.execute(
          `INSERT INTO hotel_subscriptions (id, hotel_id, plan_id, billing_interval, status, current_period_starts_at, current_period_ends_at)
           VALUES (?, ?, ?, ?, 'active', datetime('now'), ?)`,
          [uuid(), String(hotelId), payment.plan_id, payment.billing_interval, periodEnd.toISOString().split('T')[0]]
        );
      }

      db.execute(
        `UPDATE subscription_payments SET status = 'success', paid_at = datetime('now') WHERE id = ?`,
        [payment.id]
      );

      const plan = db.queryOne('SELECT name FROM subscription_plans WHERE id = ?', [payment.plan_id]);
      res.json({ success: true, message: `Subscribed to ${plan?.name || 'plan'} successfully!` });
    } else {
      db.execute(
        `UPDATE subscription_payments SET status = 'failed' WHERE id = ?`,
        [payment.id]
      );
      res.json({ success: false, message: `Payment ${verification.status}: ${verification.gateway_response}` });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Payment verification failed' });
  }
});

// Paystack callback handler (redirect)
subscriptionsRouter.get('/paystack-callback', (req: AuthRequest, res: Response) => {
  const { reference, trxref } = req.query;
  const ref = reference || trxref;
  if (ref) {
    res.redirect(`/app/payment-callback?reference=${ref}`);
  } else {
    res.redirect('/app/subscriptions?payment=failed');
  }
});

// Paystack webhook (server-to-server notification)
subscriptionsRouter.post('/paystack-webhook', async (req: AuthRequest | any, res: Response) => {
  const event = req.body;

  if (event.event === 'charge.success') {
    const { reference, metadata } = event.data;
    const hotelId = metadata?.hotel_id;
    const planId = metadata?.plan_id;
    const interval = metadata?.billing_interval;

    if (hotelId && planId && reference) {
      // Check if already processed
      const existing = db.queryOne(
        'SELECT id FROM subscription_payments WHERE paystack_reference = ? AND status = ?',
        [reference, 'success']
      );

      if (!existing) {
        const payment = db.queryOne(
          'SELECT * FROM subscription_payments WHERE paystack_reference = ?',
          [reference]
        );

        if (payment) {
          const periodEnd = new Date();
          if (interval === 'yearly') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          }

          const subExisting = db.queryOne('SELECT id FROM hotel_subscriptions WHERE hotel_id = ?', [hotelId]);
          if (subExisting) {
            db.execute(
              `UPDATE hotel_subscriptions SET plan_id = ?, billing_interval = ?, status = 'active', current_period_ends_at = ?, updated_at = datetime('now') WHERE hotel_id = ?`,
              [planId, interval, periodEnd.toISOString().split('T')[0], hotelId]
            );
          } else {
            db.execute(
              `INSERT INTO hotel_subscriptions (id, hotel_id, plan_id, billing_interval, status, current_period_starts_at, current_period_ends_at)
               VALUES (?, ?, ?, ?, 'active', datetime('now'), ?)`,
              [uuid(), hotelId, planId, interval, periodEnd.toISOString().split('T')[0]]
            );
          }

          db.execute(
            `UPDATE subscription_payments SET status = 'success', paid_at = datetime('now') WHERE id = ?`,
            [payment.id]
          );
        }
      }
    }
  }

  res.sendStatus(200);
});

subscriptionsRouter.post('/cancel', (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  db.execute(
    `UPDATE hotel_subscriptions SET status = 'cancelled', cancelled_at = datetime('now'), updated_at = datetime('now') WHERE hotel_id = ?`,
    [String(hotelId)]
  );
  res.json({ success: true, message: 'Subscription cancelled' });
});

subscriptionsRouter.get('/check-limits', (req: AuthRequest, res: Response) => {
  const hotelId = req.user?.hotel_id;
  const sub = db.queryOne(`
    SELECT sp.max_rooms, sp.max_users
    FROM hotel_subscriptions hs
    JOIN subscription_plans sp ON hs.plan_id = sp.id
    WHERE hs.hotel_id = ?
  `, [String(hotelId)]);

  if (!sub) {
    res.json({ allowed: true });
    return;
  }

  const roomCount = db.queryOne('SELECT COUNT(*) as count FROM rooms WHERE hotel_id = ?', [String(hotelId)]);
  const userCount = db.queryOne('SELECT COUNT(*) as count FROM users WHERE hotel_id = ?', [String(hotelId)]);

  res.json({
    allowed: true,
    limits: {
      maxRooms: sub.max_rooms,
      maxUsers: sub.max_users,
      currentRooms: roomCount?.count || 0,
      currentUsers: userCount?.count || 0,
      roomsExceeded: (roomCount?.count || 0) >= sub.max_rooms,
      usersExceeded: (userCount?.count || 0) >= sub.max_users,
    },
  });
});

// Check if Paystack is configured
subscriptionsRouter.get('/config', (req: AuthRequest, res: Response) => {
  res.json({
    paystackConfigured: isConfigured(),
    paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
  });
});

export function getPlanLimits(hotelId: string): { maxRooms: number; maxUsers: number } {
  const sub = db.queryOne(`
    SELECT sp.max_rooms, sp.max_users
    FROM hotel_subscriptions hs
    JOIN subscription_plans sp ON hs.plan_id = sp.id
    WHERE hs.hotel_id = ?
  `, [hotelId]);
  return sub ? { maxRooms: sub.max_rooms, maxUsers: sub.max_users } : { maxRooms: 9999, maxUsers: 9999 };
}
