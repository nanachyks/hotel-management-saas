import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { getSubscriptionGateStatus } from '../routes/subscriptions.js';

export async function requireActiveSubscription(req: AuthRequest, res: Response, next: NextFunction) {
  const status = await getSubscriptionGateStatus(req.user!.hotel_id);
  if (!status.active) {
    return res.status(402).json({ error: status.reason, code: 'SUBSCRIPTION_REQUIRED' });
  }
  next();
}
