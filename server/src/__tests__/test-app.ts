import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import { authenticate } from '../middleware/auth.js';
import { authRouter } from '../routes/auth.js';
import { usersRouter } from '../routes/users.js';
import { roomTypesRouter } from '../routes/roomTypes.js';
import { roomsRouter } from '../routes/rooms.js';
import { guestsRouter } from '../routes/guests.js';
import { bookingsRouter } from '../routes/bookings.js';
import { servicesRouter } from '../routes/services.js';
import { invoicesRouter } from '../routes/invoices.js';
import { dashboardRouter } from '../routes/dashboard.js';
import { reportsRouter } from '../routes/reports.js';
import { exportRouter } from '../routes/export.js';
import corporateRouter from '../routes/corporate.js';
import franchiseRouter from '../routes/franchise.js';
import rolesRouter from '../routes/roles.js';
import apiKeysRouter from '../routes/apiKeys.js';
import whiteLabelRouter from '../routes/whiteLabel.js';
import { publicRouter } from '../routes/public.js';
import { paystackWebhookRouter } from '../routes/paystackWebhook.js';
import { authenticateApiKey } from '../middleware/apiKeyAuth.js';
import { errorHandler } from '../middleware/errorHandler.js';

export function createApp() {
  const app = express();
  app.use(cors());
  // Mirrors index.ts: the Paystack webhook needs the raw request body to verify its signature.
  app.use(express.json({
    verify: (req: any, _res, buf) => { req.rawBody = buf; },
  }));

  app.use('/api/auth', authRouter);
  app.use('/api/room-types', authenticate, roomTypesRouter);
  app.use('/api/rooms', authenticate, roomsRouter);
  app.use('/api/guests', authenticate, guestsRouter);
  app.use('/api/bookings', authenticate, bookingsRouter);
  app.use('/api/services', authenticate, servicesRouter);
  app.use('/api/invoices', authenticate, invoicesRouter);
  app.use('/api/dashboard', authenticate, dashboardRouter);
  app.use('/api/reports', authenticate, reportsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/export', authenticate, exportRouter);
  app.use('/api/corporate', authenticate, corporateRouter);
  app.use('/api/franchise', authenticate, franchiseRouter);
  app.use('/api/roles', authenticate, rolesRouter);
  app.use('/api/api-keys', authenticate, apiKeysRouter);
  app.use('/api/white-label', authenticate, whiteLabelRouter);
  app.use('/api/subscriptions/paystack-webhook', paystackWebhookRouter);
  app.use('/api/public', authenticateApiKey, publicRouter);

  app.use(errorHandler);
  return app;
}
