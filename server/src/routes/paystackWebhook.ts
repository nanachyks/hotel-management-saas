import { Router, Request, Response } from 'express';
import { getDb } from '../db.js';
import { verifyWebhookSignature } from '../services/paystack.js';
import { activateSubscriptionForPayment } from './subscriptions.js';
import { confirmBookingPayment } from './public.js';

export const paystackWebhookRouter = Router();
const db = getDb();

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

// Deliberately not behind `authenticate` — Paystack calls this server-to-server with no user
// JWT, only its own HMAC signature (verified below) to prove the request is genuinely theirs.
paystackWebhookRouter.post('/', async (req: RawBodyRequest, res: Response) => {
  const signature = req.headers['x-paystack-signature'];
  if (!req.rawBody || !verifyWebhookSignature(req.rawBody, signature)) {
    return res.sendStatus(401);
  }

  const event = req.body;

  if (event.event === 'charge.success') {
    const { reference, metadata } = event.data;
    const hotelId = metadata?.hotel_id;

    if (hotelId && reference && metadata?.type === 'booking' && metadata?.booking_id) {
      const payment = await db.queryOne(
        'SELECT * FROM booking_payments WHERE paystack_reference = ?',
        [reference]
      );
      if (payment && payment.status !== 'success') {
        await confirmBookingPayment(payment);
      }
    } else if (hotelId && metadata?.plan_id && reference) {
      const payment = await db.queryOne(
        'SELECT * FROM subscription_payments WHERE paystack_reference = ?',
        [reference]
      );
      if (payment && payment.status !== 'success') {
        await activateSubscriptionForPayment(payment);
      }
    }
  }

  res.sendStatus(200);
});
