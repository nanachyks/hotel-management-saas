import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { initDb } from './db.js';
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

const corsOrigins = process.env.CORS_ORIGINS || 'http://localhost:5173';
app.use(cors({
  origin: corsOrigins.split(',').map(s => s.trim()),
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(import.meta.dirname, '..', 'uploads')));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

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
app.use('/api/email-config', authenticate, emailConfigRouter);
app.use('/api/hotels', hotelsRouter);
app.use('/api/expenses', authenticate, expensesRouter);
app.use('/api/reports', authenticate, reportsRouter);
app.use('/api/departments', authenticate, departmentsRouter);
app.use('/api/employees', authenticate, employeesRouter);
app.use('/api/shifts', authenticate, shiftsRouter);
app.use('/api/attendance', authenticate, attendanceRouter);
app.use('/api/housekeeping', authenticate, housekeepingRouter);
app.use('/api/maintenance', authenticate, maintenanceRouter);
app.use('/api/room-service', authenticate, roomServiceRouter);
app.use('/api/deposits', authenticate, depositsRouter);
app.use('/api/notifications', authenticate, notificationsRouter);
app.use('/api/subscriptions', authenticate, subscriptionsRouter);
app.use('/api/taxes', authenticate, taxesRouter);
app.use('/api/inventory', authenticate, inventoryRouter);
app.use('/api/currencies', currenciesRouter);
app.use('/api/payroll', authenticate, payrollRouter);
app.use('/api/integrations', authenticate, integrationsRouter);
app.use('/api/ai', authenticate, aiRouter);
app.use('/api/corporate', authenticate, corporateRouter);
app.use('/api/franchise', authenticate, franchiseRouter);
app.use('/api/roles', authenticate, rolesRouter);
app.use('/api/api-keys', authenticate, apiKeysRouter);
app.use('/api/white-label', authenticate, whiteLabelRouter);
app.use('/api/enterprise', authenticate, enterpriseRouter);
app.use('/api/channels', authenticate, channelsRouter);

app.use(errorHandler);

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
