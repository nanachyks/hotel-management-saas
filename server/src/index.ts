import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { initDb, getDb } from './db.js';
import { authenticate } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { roomTypesRouter } from './routes/roomTypes.js';
import { roomsRouter } from './routes/rooms.js';
import { guestsRouter } from './routes/guests.js';
import { bookingsRouter } from './routes/bookings.js';
import { servicesRouter } from './routes/services.js';
import { invoicesRouter } from './routes/invoices.js';
import { dashboardRouter } from './routes/dashboard.js';
import { exportRouter } from './routes/export.js';
import { emailConfigRouter } from './routes/emailConfig.js';
import { hotelsRouter } from './routes/hotels.js';
import { expensesRouter } from './routes/expenses.js';
import { reportsRouter } from './routes/reports.js';
import { departmentsRouter } from './routes/departments.js';
import { employeesRouter } from './routes/employees.js';
import { shiftsRouter } from './routes/shifts.js';
import { attendanceRouter } from './routes/attendance.js';
import { housekeepingRouter } from './routes/housekeeping.js';
import { maintenanceRouter } from './routes/maintenance.js';
import { roomServiceRouter } from './routes/roomService.js';
import { depositsRouter } from './routes/deposits.js';
import { notificationsRouter } from './routes/notifications.js';
import { subscriptionsRouter } from './routes/subscriptions.js';
import { taxesRouter } from './routes/taxes.js';
import { inventoryRouter } from './routes/inventory.js';
import { currenciesRouter } from './routes/currencies.js';
import { payrollRouter } from './routes/payroll.js';
import { integrationsRouter } from './routes/integrations.js';
import { aiRouter } from './routes/ai.js';
import corporateRouter from './routes/corporate.js';
import franchiseRouter from './routes/franchise.js';
import rolesRouter from './routes/roles.js';
import apiKeysRouter from './routes/apiKeys.js';
import whiteLabelRouter from './routes/whiteLabel.js';
import enterpriseRouter from './routes/enterprise.js';
import { channelsRouter } from './routes/channels.js';
import { publicRouter } from './routes/public.js';
import { authenticateApiKey } from './middleware/apiKeyAuth.js';
import { requireActiveSubscription } from './middleware/subscriptionGate.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Only trust X-Forwarded-For when explicitly configured (e.g. behind a known
// reverse proxy/load balancer). Left unset, req.ip is the raw socket address,
// which a client cannot spoof — this is what login rate-limiting relies on.
if (process.env.TRUST_PROXY) {
  const trustProxy = Number(process.env.TRUST_PROXY);
  app.set('trust proxy', Number.isNaN(trustProxy) ? process.env.TRUST_PROXY : trustProxy);
}

app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const corsOrigins = process.env.CORS_ORIGINS || 'http://localhost:5173';
app.use(cors({
  origin: corsOrigins.split(',').map(s => s.trim()),
  credentials: true,
}));
app.use(express.json());

// Unauthenticated, unrate-limited so load balancers/orchestrators can probe liveness freely.
app.get('/health', async (_req, res) => {
  try {
    await getDb().queryOne('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', error: 'Database unavailable' });
  }
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// Account/admin/config routes stay reachable even with a lapsed subscription, so a hotel can
// always manage its account, staff, and billing well enough to renew.
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/hotels', hotelsRouter);
app.use('/api/email-config', authenticate, emailConfigRouter);
app.use('/api/subscriptions', authenticate, subscriptionsRouter);
app.use('/api/currencies', currenciesRouter);
app.use('/api/api-keys', authenticate, apiKeysRouter);
app.use('/api/white-label', authenticate, whiteLabelRouter);
app.use('/api/enterprise', authenticate, enterpriseRouter);
app.use('/api/roles', authenticate, rolesRouter);
app.use('/api/public', authenticateApiKey, publicRouter);

// Core operational routes require an active (non-expired, non-cancelled) subscription.
app.use('/api/room-types', authenticate, requireActiveSubscription, roomTypesRouter);
app.use('/api/rooms', authenticate, requireActiveSubscription, roomsRouter);
app.use('/api/guests', authenticate, requireActiveSubscription, guestsRouter);
app.use('/api/bookings', authenticate, requireActiveSubscription, bookingsRouter);
app.use('/api/services', authenticate, requireActiveSubscription, servicesRouter);
app.use('/api/invoices', authenticate, requireActiveSubscription, invoicesRouter);
app.use('/api/dashboard', authenticate, requireActiveSubscription, dashboardRouter);
app.use('/api/export', authenticate, requireActiveSubscription, exportRouter);
app.use('/api/expenses', authenticate, requireActiveSubscription, expensesRouter);
app.use('/api/reports', authenticate, requireActiveSubscription, reportsRouter);
app.use('/api/departments', authenticate, requireActiveSubscription, departmentsRouter);
app.use('/api/employees', authenticate, requireActiveSubscription, employeesRouter);
app.use('/api/shifts', authenticate, requireActiveSubscription, shiftsRouter);
app.use('/api/attendance', authenticate, requireActiveSubscription, attendanceRouter);
app.use('/api/housekeeping', authenticate, requireActiveSubscription, housekeepingRouter);
app.use('/api/maintenance', authenticate, requireActiveSubscription, maintenanceRouter);
app.use('/api/room-service', authenticate, requireActiveSubscription, roomServiceRouter);
app.use('/api/deposits', authenticate, requireActiveSubscription, depositsRouter);
app.use('/api/notifications', authenticate, requireActiveSubscription, notificationsRouter);
app.use('/api/taxes', authenticate, requireActiveSubscription, taxesRouter);
app.use('/api/inventory', authenticate, requireActiveSubscription, inventoryRouter);
app.use('/api/payroll', authenticate, requireActiveSubscription, payrollRouter);
app.use('/api/integrations', authenticate, requireActiveSubscription, integrationsRouter);
app.use('/api/ai', authenticate, requireActiveSubscription, aiRouter);
app.use('/api/corporate', authenticate, requireActiveSubscription, corporateRouter);
app.use('/api/franchise', authenticate, requireActiveSubscription, franchiseRouter);
app.use('/api/channels', authenticate, requireActiveSubscription, channelsRouter);

app.use(errorHandler);

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
