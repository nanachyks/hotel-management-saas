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
import { exportRouter } from '../routes/export.js';
import { errorHandler } from '../middleware/errorHandler.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', authRouter);
  app.use('/api/room-types', authenticate, roomTypesRouter);
  app.use('/api/rooms', authenticate, roomsRouter);
  app.use('/api/guests', authenticate, guestsRouter);
  app.use('/api/bookings', authenticate, bookingsRouter);
  app.use('/api/services', authenticate, servicesRouter);
  app.use('/api/invoices', authenticate, invoicesRouter);
  app.use('/api/dashboard', authenticate, dashboardRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/export', authenticate, exportRouter);

  app.use(errorHandler);
  return app;
}
