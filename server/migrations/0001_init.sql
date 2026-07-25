-- Initial Postgres schema for the Hotel Management SaaS.
-- Translated from the sql.js/SQLite schema previously defined in server/src/db.ts.
-- Notes on deliberate deviations from a literal 1:1 port:
--   * TIMESTAMPTZ is used for columns that represent a point in time (created_at/updated_at
--     style, or anything defaulted via SQLite's datetime('now')). Plain calendar-date columns
--     that were always app-supplied 'YYYY-MM-DD' strings (check_in_date, due_date, etc.) stay
--     TEXT, matching how the app already treats them; date arithmetic casts with ::date at the
--     query site instead.
--   * INTEGER 0/1 flag columns become native BOOLEAN.
--   * Money/rate columns use DOUBLE PRECISION (not NUMERIC) so node-postgres keeps returning
--     JS numbers instead of strings, preserving existing arithmetic in the app code.
--   * custom_roles is created before users so users.role_id can reference it without a
--     forward-reference workaround.

CREATE TABLE hotels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'USD',
  tax_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  check_in_time TEXT NOT NULL DEFAULT '14:00',
  check_out_time TEXT NOT NULL DEFAULT '11:00',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','maintenance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE custom_roles (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  name TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'receptionist' CHECK (role IN ('admin','owner','manager','receptionist','housekeeping','accountant')),
  role_id TEXT REFERENCES custom_roles(id),
  email_verified BOOLEAN NOT NULL DEFAULT false,
  invitation_token TEXT,
  invitation_accepted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hotel_id, username)
);

CREATE TABLE room_types (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  base_price DOUBLE PRECISION NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  room_number TEXT NOT NULL,
  room_type_id TEXT NOT NULL REFERENCES room_types(id),
  floor INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','reserved','occupied','cleaning','maintenance','out_of_service')),
  photo TEXT,
  amenities TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  price DOUBLE PRECISION,
  capacity INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hotel_id, room_number)
);

CREATE TABLE guests (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  id_card_number TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  guest_id TEXT NOT NULL REFERENCES guests(id),
  room_id TEXT NOT NULL REFERENCES rooms(id),
  check_in_date TEXT NOT NULL,
  check_out_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','checked_in','checked_out','cancelled','no_show')),
  source TEXT NOT NULL DEFAULT 'walk_in' CHECK (source IN ('walk_in','online','phone','corporate','group')),
  total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  actual_check_in TIMESTAMPTZ,
  actual_check_out TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE services (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price DOUBLE PRECISION NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE booking_services (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  service_id TEXT NOT NULL REFERENCES services(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  price DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  amount DOUBLE PRECISION NOT NULL,
  paid_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  discount DOUBLE PRECISION NOT NULL DEFAULT 0,
  tax_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  deposit DOUBLE PRECISION NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','partial','cancelled','refunded')),
  issued_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE login_attempts (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username TEXT NOT NULL,
  ip TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE email_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE hotel_invitations (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'receptionist',
  accepted BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  amount DOUBLE PRECISION NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('cash','card','mobile_money','bank_transfer')),
  reference TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  category TEXT NOT NULL DEFAULT 'utilities' CHECK (category IN ('utilities','supplies','maintenance','salary','marketing','food','transport','other')),
  description TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  date TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE deposits (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  amount DOUBLE PRECISION NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('cash','card','mobile_money','bank_transfer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE departments (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE employees (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  department_id TEXT REFERENCES departments(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  position TEXT NOT NULL DEFAULT '',
  hourly_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shifts (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  employee_id TEXT NOT NULL REFERENCES employees(id),
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  employee_id TEXT NOT NULL REFERENCES employees(id),
  date TEXT NOT NULL,
  check_in TEXT,
  check_out TEXT,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','late','half_day')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE housekeeping_tasks (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  room_id TEXT NOT NULL REFERENCES rooms(id),
  assigned_to TEXT REFERENCES employees(id),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','inspected')),
  scheduled_date TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE housekeeping_inspections (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES housekeeping_tasks(id),
  inspected_by TEXT REFERENCES employees(id),
  cleanliness INTEGER DEFAULT 5 CHECK (cleanliness BETWEEN 1 AND 5),
  supplies_restocked BOOLEAN NOT NULL DEFAULT false,
  damage_found TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE maintenance_requests (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  room_id TEXT REFERENCES rooms(id),
  reported_by TEXT REFERENCES employees(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported','in_progress','resolved','closed')),
  assigned_to TEXT REFERENCES employees(id),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  user_id TEXT REFERENCES users(id),
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE room_service_requests (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  booking_id TEXT REFERENCES bookings(id),
  room_id TEXT NOT NULL REFERENCES rooms(id),
  guest_name TEXT NOT NULL DEFAULT '',
  request_type TEXT NOT NULL CHECK (request_type IN ('food','laundry','towels','wake_up','other')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','delivered','completed','cancelled')),
  assigned_to TEXT REFERENCES employees(id),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  price_monthly DOUBLE PRECISION NOT NULL DEFAULT 0,
  price_yearly DOUBLE PRECISION NOT NULL DEFAULT 0,
  max_rooms INTEGER NOT NULL DEFAULT 0,
  max_users INTEGER NOT NULL DEFAULT 0,
  features TEXT NOT NULL DEFAULT '[]',
  highlighted BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE hotel_subscriptions (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL UNIQUE REFERENCES hotels(id),
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly','yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','trial','cancelled','expired','past_due')),
  trial_ends_at TIMESTAMPTZ,
  current_period_starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  paystack_subscription_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscription_payments (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  amount DOUBLE PRECISION NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  billing_interval TEXT NOT NULL,
  paystack_reference TEXT,
  paystack_access_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE hotel_taxes (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  name TEXT NOT NULL,
  rate DOUBLE PRECISION NOT NULL,
  type TEXT NOT NULL DEFAULT 'percentage' CHECK (type IN ('percentage','fixed')),
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_items (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'supplies' CHECK (category IN ('toiletries','linens','minibar','cleaning','maintenance','office','other')),
  quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'piece',
  min_stock DOUBLE PRECISION NOT NULL DEFAULT 0,
  cost_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE currencies (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL DEFAULT ''
);

CREATE TABLE exchange_rates (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  from_currency TEXT NOT NULL REFERENCES currencies(code),
  to_currency TEXT NOT NULL REFERENCES currencies(code),
  rate DOUBLE PRECISION NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (from_currency, to_currency)
);

CREATE TABLE franchise_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_hotel_id TEXT REFERENCES hotels(id),
  settings TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE franchise_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES franchise_groups(id),
  hotel_id TEXT NOT NULL UNIQUE REFERENCES hotels(id),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member','affiliate')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE corporate_accounts (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  credit_limit DOUBLE PRECISION NOT NULL DEFAULT 0,
  payment_terms TEXT NOT NULL DEFAULT 'net30' CHECK (payment_terms IN ('net15','net30','net45','net60','prepaid')),
  discount_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE corporate_rates (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES corporate_accounts(id),
  room_type_id TEXT NOT NULL REFERENCES room_types(id),
  negotiated_price DOUBLE PRECISION NOT NULL,
  valid_from TEXT,
  valid_until TEXT
);

CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  secret TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT '["read"]',
  ip_whitelist TEXT NOT NULL DEFAULT '[]',
  rate_limit INTEGER NOT NULL DEFAULT 100,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE white_label_settings (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL UNIQUE REFERENCES hotels(id),
  custom_domain TEXT NOT NULL DEFAULT '',
  favicon_url TEXT NOT NULL DEFAULT '',
  primary_color TEXT NOT NULL DEFAULT '#3b82f6',
  logo_url TEXT NOT NULL DEFAULT '',
  email_from_name TEXT NOT NULL DEFAULT '',
  email_logo_url TEXT NOT NULL DEFAULT '',
  custom_css TEXT NOT NULL DEFAULT '',
  footer_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE integrations (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  type TEXT NOT NULL CHECK (type IN ('channel_manager','payment_gateway','pos','accounting','door_lock','key_card')),
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL DEFAULT '',
  api_secret TEXT NOT NULL DEFAULT '',
  endpoint_url TEXT NOT NULL DEFAULT '',
  credentials TEXT NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE hotel_members (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  role TEXT NOT NULL DEFAULT 'receptionist',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, hotel_id)
);

CREATE TABLE payroll_periods (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','processing','closed')),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payroll_deductions (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percentage','fixed')),
  value DOUBLE PRECISION NOT NULL DEFAULT 0,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payroll_entries (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  period_id TEXT NOT NULL REFERENCES payroll_periods(id),
  employee_id TEXT NOT NULL REFERENCES employees(id),
  base_pay DOUBLE PRECISION NOT NULL DEFAULT 0,
  overtime_pay DOUBLE PRECISION NOT NULL DEFAULT 0,
  bonuses DOUBLE PRECISION NOT NULL DEFAULT 0,
  deductions_total DOUBLE PRECISION NOT NULL DEFAULT 0,
  net_pay DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid')),
  paid_at TIMESTAMPTZ,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payslips (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES payroll_entries(id),
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  employee_id TEXT NOT NULL REFERENCES employees(id),
  period_id TEXT NOT NULL REFERENCES payroll_periods(id),
  gross_pay DOUBLE PRECISION NOT NULL DEFAULT 0,
  deductions_breakdown TEXT NOT NULL DEFAULT '[]',
  net_pay DOUBLE PRECISION NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE channel_connections (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  channel TEXT NOT NULL,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL DEFAULT '',
  endpoint_url TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_transactions (
  id TEXT PRIMARY KEY,
  hotel_id TEXT NOT NULL REFERENCES hotels(id),
  item_id TEXT NOT NULL REFERENCES inventory_items(id),
  type TEXT NOT NULL CHECK (type IN ('in','out','adjustment')),
  quantity DOUBLE PRECISION NOT NULL,
  reference TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
