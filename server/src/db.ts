import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(import.meta.dirname, '..', 'data', 'hotel.db');

let db: any;
let SQL: any;
let persistToDisk = true;

function save() {
  if (!persistToDisk) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export async function initDb() {
  SQL = await initSqlJs();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  createTables();
  save();
  return db;
}

export async function initTestDb() {
  SQL = await initSqlJs();
  db = new SQL.Database();
  persistToDisk = false;
  createTables();
  return db;
}

export function resetDb(newDb: any) {
  db = newDb;
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS hotels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      logo_url TEXT DEFAULT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      tax_rate REAL NOT NULL DEFAULT 0,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      check_in_time TEXT NOT NULL DEFAULT '14:00',
      check_out_time TEXT NOT NULL DEFAULT '11:00',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      username TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'receptionist' CHECK(role IN ('admin','owner','manager','receptionist','housekeeping','accountant')),
      email_verified INTEGER NOT NULL DEFAULT 0,
      invitation_token TEXT DEFAULT NULL,
      invitation_accepted INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id),
      UNIQUE(hotel_id, username)
    )
  `);
  // Add role_id column if missing (migration)
  try { db.run("ALTER TABLE users ADD COLUMN role_id TEXT DEFAULT NULL REFERENCES custom_roles(id)"); } catch {}
  try { db.run("ALTER TABLE hotels ADD COLUMN logo_url TEXT DEFAULT ''"); } catch {}
  try { db.run("ALTER TABLE hotels ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','maintenance'))"); } catch {}
  db.run(`
    CREATE TABLE IF NOT EXISTS room_types (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      base_price REAL NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      room_number TEXT NOT NULL,
      room_type_id TEXT NOT NULL,
      floor INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','reserved','occupied','cleaning','maintenance','out_of_service')),
      photo TEXT DEFAULT NULL,
      amenities TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      price REAL DEFAULT NULL,
      capacity INTEGER DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id),
      FOREIGN KEY (room_type_id) REFERENCES room_types(id),
      UNIQUE(hotel_id, room_number)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS guests (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      id_card_number TEXT DEFAULT '',
      address TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      guest_id TEXT NOT NULL,
      room_id TEXT NOT NULL,
      check_in_date TEXT NOT NULL,
      check_out_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','checked_in','checked_out','cancelled','no_show')),
      source TEXT NOT NULL DEFAULT 'walk_in' CHECK(source IN ('walk_in','online','phone','corporate','group')),
      total_amount REAL NOT NULL DEFAULT 0,
      actual_check_in TEXT DEFAULT NULL,
      actual_check_out TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id),
      FOREIGN KEY (guest_id) REFERENCES guests(id),
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS booking_services (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      price REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (booking_id) REFERENCES bookings(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      booking_id TEXT NOT NULL,
      amount REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      deposit REAL NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','partial','cancelled','refunded')),
      issued_date TEXT NOT NULL DEFAULT (datetime('now')),
      due_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id),
      FOREIGN KEY (booking_id) REFERENCES bookings(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      ip TEXT NOT NULL,
      success INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS hotel_invitations (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'receptionist',
      accepted INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id)
    )
  `);

  try { db.run("ALTER TABLE hotel_subscriptions ADD COLUMN billing_interval TEXT NOT NULL DEFAULT 'monthly'"); } catch {}
  try { db.run("ALTER TABLE rooms ADD COLUMN photo TEXT DEFAULT NULL"); } catch {}
  try { db.run("ALTER TABLE guests ADD COLUMN whatsapp TEXT DEFAULT ''"); } catch {}
  try { db.run("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0"); } catch {}
  try { db.run("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'receptionist'"); } catch {}
  try { db.run("ALTER TABLE users ADD COLUMN hotel_id TEXT DEFAULT NULL"); } catch {}
  try { db.run("ALTER TABLE users ADD COLUMN invitation_token TEXT DEFAULT NULL"); } catch {}
  try { db.run("ALTER TABLE users ADD COLUMN invitation_accepted INTEGER NOT NULL DEFAULT 1"); } catch {}
  try { db.run("ALTER TABLE room_types ADD COLUMN hotel_id TEXT DEFAULT NULL"); } catch {}
  try { db.run("ALTER TABLE rooms ADD COLUMN hotel_id TEXT DEFAULT NULL"); } catch {}
  try { db.run("ALTER TABLE guests ADD COLUMN hotel_id TEXT DEFAULT NULL"); } catch {}
  try { db.run("ALTER TABLE bookings ADD COLUMN hotel_id TEXT DEFAULT NULL"); } catch {}
  try { db.run("ALTER TABLE services ADD COLUMN hotel_id TEXT DEFAULT NULL"); } catch {}
  try { db.run("ALTER TABLE invoices ADD COLUMN hotel_id TEXT DEFAULT NULL"); } catch {}
  try { db.run("ALTER TABLE rooms ADD COLUMN amenities TEXT DEFAULT ''"); } catch {}
  try { db.run("ALTER TABLE rooms ADD COLUMN notes TEXT DEFAULT ''"); } catch {}
  try { db.run("ALTER TABLE rooms ADD COLUMN price REAL DEFAULT NULL"); } catch {}
  try { db.run("ALTER TABLE rooms ADD COLUMN capacity INTEGER DEFAULT NULL"); } catch {}
  try { db.run("ALTER TABLE bookings ADD COLUMN actual_check_in TEXT DEFAULT NULL"); } catch {}
  try { db.run("ALTER TABLE bookings ADD COLUMN actual_check_out TEXT DEFAULT NULL"); } catch {}
  try { db.run("UPDATE users SET role = 'owner' WHERE role = 'admin'"); } catch {}
  try { db.run("UPDATE users SET role = 'receptionist' WHERE role = 'staff'"); } catch {}
  try { db.run("UPDATE rooms SET status = 'out_of_service' WHERE status = 'maintenance'"); } catch {}
  try { db.run("ALTER TABLE bookings ADD COLUMN source TEXT NOT NULL DEFAULT 'walk_in'"); } catch {}
  try { db.run("UPDATE bookings SET status = 'pending' WHERE status = 'confirmed'"); } catch {}
  try { db.run("ALTER TABLE invoices ADD COLUMN discount REAL NOT NULL DEFAULT 0"); } catch {}
  try { db.run("ALTER TABLE invoices ADD COLUMN tax_amount REAL NOT NULL DEFAULT 0"); } catch {}
  try { db.run("ALTER TABLE invoices ADD COLUMN deposit REAL NOT NULL DEFAULT 0"); } catch {}
  try { db.run("ALTER TABLE invoices ADD COLUMN notes TEXT DEFAULT ''"); } catch {}

  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      amount REAL NOT NULL,
      method TEXT NOT NULL CHECK(method IN ('cash','card','mobile_money','bank_transfer')),
      reference TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'utilities' CHECK(category IN ('utilities','supplies','maintenance','salary','marketing','food','transport','other')),
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS deposits (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      amount REAL NOT NULL,
      method TEXT NOT NULL CHECK(method IN ('cash','card','mobile_money','bank_transfer')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (booking_id) REFERENCES bookings(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      department_id TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      position TEXT DEFAULT '',
      hourly_rate REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id),
      FOREIGN KEY (department_id) REFERENCES departments(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      date TEXT NOT NULL,
      check_in TEXT DEFAULT NULL,
      check_out TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'present' CHECK(status IN ('present','absent','late','half_day')),
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS housekeeping_tasks (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      room_id TEXT NOT NULL,
      assigned_to TEXT DEFAULT NULL,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','inspected')),
      scheduled_date TEXT DEFAULT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id),
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (assigned_to) REFERENCES employees(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS housekeeping_inspections (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      inspected_by TEXT DEFAULT NULL,
      cleanliness INTEGER DEFAULT 5 CHECK(cleanliness BETWEEN 1 AND 5),
      supplies_restocked INTEGER DEFAULT 0,
      damage_found TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES housekeeping_tasks(id),
      FOREIGN KEY (inspected_by) REFERENCES employees(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS maintenance_requests (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      room_id TEXT DEFAULT NULL,
      reported_by TEXT DEFAULT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
      status TEXT NOT NULL DEFAULT 'reported' CHECK(status IN ('reported','in_progress','resolved','closed')),
      assigned_to TEXT DEFAULT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id),
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (reported_by) REFERENCES employees(id),
      FOREIGN KEY (assigned_to) REFERENCES employees(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      user_id TEXT DEFAULT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      title TEXT NOT NULL,
      message TEXT DEFAULT '',
      link TEXT DEFAULT '',
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS room_service_requests (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      booking_id TEXT DEFAULT NULL,
      room_id TEXT NOT NULL,
      guest_name TEXT DEFAULT '',
      request_type TEXT NOT NULL CHECK(request_type IN ('food','laundry','towels','wake_up','other')),
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','delivered','completed','cancelled')),
      assigned_to TEXT DEFAULT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id),
      FOREIGN KEY (booking_id) REFERENCES bookings(id),
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (assigned_to) REFERENCES employees(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      price_monthly REAL NOT NULL DEFAULT 0,
      price_yearly REAL NOT NULL DEFAULT 0,
      max_rooms INTEGER NOT NULL DEFAULT 0,
      max_users INTEGER NOT NULL DEFAULT 0,
      features TEXT DEFAULT '[]',
      highlighted INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS hotel_subscriptions (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL UNIQUE,
      plan_id TEXT NOT NULL,
      billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK(billing_interval IN ('monthly','yearly')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','trial','cancelled','expired','past_due')),
      trial_ends_at TEXT DEFAULT NULL,
      current_period_starts_at TEXT NOT NULL DEFAULT (datetime('now')),
      current_period_ends_at TEXT DEFAULT NULL,
      cancelled_at TEXT DEFAULT NULL,
      paystack_subscription_code TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id),
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS subscription_payments (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'GHS',
      billing_interval TEXT NOT NULL,
      paystack_reference TEXT DEFAULT NULL,
      paystack_access_code TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','success','failed')),
      paid_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id),
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS hotel_taxes (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      name TEXT NOT NULL,
      rate REAL NOT NULL,
      type TEXT NOT NULL DEFAULT 'percentage' CHECK(type IN ('percentage','fixed')),
      is_mandatory INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'supplies' CHECK(category IN ('toiletries','linens','minibar','cleaning','maintenance','office','other')),
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'piece',
      min_stock REAL NOT NULL DEFAULT 0,
      cost_price REAL NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS currencies (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL default ''
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS exchange_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_currency TEXT NOT NULL,
      to_currency TEXT NOT NULL,
      rate REAL NOT NULL default 1,
      updated_at TEXT NOT NULL default (datetime('now')),
      FOREIGN KEY (from_currency) REFERENCES currencies(code),
      FOREIGN KEY (to_currency) REFERENCES currencies(code),
      UNIQUE(from_currency, to_currency)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS franchise_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_hotel_id TEXT,
      settings TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (parent_hotel_id) REFERENCES hotels(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS franchise_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      hotel_id TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner','member','affiliate')),
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (group_id) REFERENCES franchise_groups(id),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS corporate_accounts (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      company_name TEXT NOT NULL,
      contact_name TEXT DEFAULT '',
      contact_email TEXT DEFAULT '',
      contact_phone TEXT DEFAULT '',
      credit_limit REAL DEFAULT 0,
      payment_terms TEXT NOT NULL DEFAULT 'net30' CHECK(payment_terms IN ('net15','net30','net45','net60','prepaid')),
      discount_rate REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','suspended')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS corporate_rates (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      room_type_id TEXT NOT NULL,
      negotiated_price REAL NOT NULL,
      valid_from TEXT DEFAULT NULL,
      valid_until TEXT DEFAULT NULL,
      FOREIGN KEY (account_id) REFERENCES corporate_accounts(id),
      FOREIGN KEY (room_type_id) REFERENCES room_types(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS custom_roles (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      name TEXT NOT NULL,
      permissions TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      name TEXT NOT NULL,
      key TEXT NOT NULL UNIQUE,
      secret TEXT NOT NULL,
      permissions TEXT NOT NULL DEFAULT '["read"]',
      ip_whitelist TEXT DEFAULT '[]',
      rate_limit INTEGER NOT NULL DEFAULT 100,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_used_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS white_label_settings (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL UNIQUE,
      custom_domain TEXT DEFAULT '',
      favicon_url TEXT DEFAULT '',
      primary_color TEXT DEFAULT '#3b82f6',
      logo_url TEXT DEFAULT '',
      email_from_name TEXT DEFAULT '',
      email_logo_url TEXT DEFAULT '',
      custom_css TEXT DEFAULT '',
      footer_text TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('channel_manager','payment_gateway','pos','accounting','door_lock','key_card')),
      provider TEXT NOT NULL,
      name TEXT NOT NULL,
      api_key TEXT DEFAULT '',
      api_secret TEXT DEFAULT '',
      endpoint_url TEXT DEFAULT '',
      credentials TEXT DEFAULT '{}',
      enabled INTEGER NOT NULL DEFAULT 1,
      last_sync_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS hotel_members (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      hotel_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'receptionist',
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id),
      UNIQUE(user_id, hotel_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payroll_periods (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','processing','closed')),
      processed_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payroll_deductions (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('percentage','fixed')),
      value REAL NOT NULL DEFAULT 0,
      is_mandatory INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payroll_entries (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      period_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      base_pay REAL NOT NULL DEFAULT 0,
      overtime_pay REAL NOT NULL DEFAULT 0,
      bonuses REAL NOT NULL DEFAULT 0,
      deductions_total REAL NOT NULL DEFAULT 0,
      net_pay REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','paid')),
      paid_at TEXT DEFAULT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id),
      FOREIGN KEY (period_id) REFERENCES payroll_periods(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payslips (
      id TEXT PRIMARY KEY,
      entry_id TEXT NOT NULL,
      hotel_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      period_id TEXT NOT NULL,
      gross_pay REAL NOT NULL DEFAULT 0,
      deductions_breakdown TEXT DEFAULT '[]',
      net_pay REAL NOT NULL DEFAULT 0,
      generated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (entry_id) REFERENCES payroll_entries(id),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (period_id) REFERENCES payroll_periods(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('in','out','adjustment')),
      quantity REAL NOT NULL,
      reference TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (hotel_id) REFERENCES hotels(id),
      FOREIGN KEY (item_id) REFERENCES inventory_items(id)
    )
  `);
}

function queryAll(sql: string, params?: any[]): any[] {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql: string, params?: any[]): any | null {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function execute(sql: string, params?: any[]) {
  db.run(sql, params);
  save();
}

export function getDb() {
  return { queryAll, queryOne, execute };
}
