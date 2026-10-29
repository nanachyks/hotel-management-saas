import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { initDb, getDb } from './db.js';

/* ─────────────────────────────────────────────────────────────
   The public sales demo tenant.

   Powers the "Try the Live Demo" button on the landing page:
   username demo.admin / password demo123 (also demo.owner / demo123
   for the owner-oversight view). Ghana-flavored data, GHS prices,
   an ACTIVE subscription so the demo is never locked out, and a
   reset routine the server runs nightly (see jobs/demoReset.ts)
   plus on demand via `npm run seed:demo`.

   The reset is tenant-scoped: it wipes and re-creates ONLY this
   hotel's rows, leaving real tenants untouched.
   ───────────────────────────────────────────────────────────── */

export const DEMO_HOTEL_SLUG = 'golden-sands-osu';
export const DEMO_ADMIN = 'demo.admin';
export const DEMO_OWNER = 'demo.owner';
export const DEMO_PASSWORD = 'demo123';

const db = getDb();

const fmtDay = (d: Date) => d.toISOString().split('T')[0];

async function wipeDemoTenant(hotelId: string) {
  // Join-keyed children first (they carry no hotel_id of their own).
  await db.execute('DELETE FROM booking_services WHERE booking_id IN (SELECT id FROM bookings WHERE hotel_id = ?)', [hotelId]);
  await db.execute('DELETE FROM deposits WHERE booking_id IN (SELECT id FROM bookings WHERE hotel_id = ?)', [hotelId]);
  await db.execute('DELETE FROM housekeeping_inspections WHERE task_id IN (SELECT id FROM housekeeping_tasks WHERE hotel_id = ?)', [hotelId]);
  await db.execute('DELETE FROM payments WHERE invoice_id IN (SELECT id FROM invoices WHERE hotel_id = ?)', [hotelId]);
  await db.execute('DELETE FROM corporate_rates WHERE account_id IN (SELECT id FROM corporate_accounts WHERE hotel_id = ?)', [hotelId]);
  await db.execute('DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE hotel_id = ?)', [hotelId]);
  await db.execute('DELETE FROM password_resets WHERE user_id IN (SELECT id FROM users WHERE hotel_id = ?)', [hotelId]);
  await db.execute('DELETE FROM email_verifications WHERE user_id IN (SELECT id FROM users WHERE hotel_id = ?)', [hotelId]);

  // Remaining tables that carry hotel_id — children ordered before parents.
  const orderedTables = [
    'room_service_requests', 'housekeeping_tasks', 'maintenance_requests',
    'attendance', 'shifts', 'payslips', 'payroll_entries', 'payroll_periods', 'payroll_deductions',
    'inventory_transactions', 'inventory_items',
    'booking_payments', 'invoices', 'bookings',
    'services', 'guests', 'rooms', 'room_types',
    'corporate_accounts',
    'franchise_members',
    'subscription_payments', 'hotel_subscriptions', 'hotel_taxes',
    'api_keys', 'integrations', 'channel_connections', 'notifications',
    'white_label_settings', 'custom_roles',
    'expenses', 'employees', 'departments',
    'hotel_invitations', 'hotel_members', 'users',
  ];
  for (const t of orderedTables) {
    try {
      await db.execute(`DELETE FROM ${t} WHERE hotel_id = ?`, [hotelId]);
    } catch (err: any) {
      console.error(`Demo wipe failed on table '${t}':`, err.message);
      throw err;
    }
  }
  await db.execute('DELETE FROM franchise_groups WHERE parent_hotel_id = ?', [hotelId]);
  await db.execute('DELETE FROM hotels WHERE id = ?', [hotelId]);
}

export async function findDemoHotel(): Promise<{ id: string; name: string } | null> {
  const hotel = await db.queryOne('SELECT id, name FROM hotels WHERE slug = ?', [DEMO_HOTEL_SLUG]);
  return hotel ?? null;
}

// How fresh the demo data is (age of the newest demo user row — reset
// refreshes users, so this doubles as a reset marker without extra tables).
export async function demoTenantAgeHours(): Promise<number | null> {
  const hotel = await findDemoHotel();
  if (!hotel) return null;
  const row = await db.queryOne('SELECT MAX(created_at) AS last FROM users WHERE hotel_id = ?', [hotel.id]);
  const last = row?.last ? new Date(row.last).getTime() : 0;
  return (Date.now() - last) / 3600000;
}

// Is this hotel the public demo tenant? Cached per hotel_id — used by the auth
// responses (user.is_demo) and the demo guard middleware on config routers.
// The demo reset creates a NEW hotel id each time, so stale cache keys are
// harmless (they just refer to wiped tenants).
const isDemoCache = new Map<string, boolean>();

export async function isDemoTenantId(hotelId?: string | null): Promise<boolean> {
  if (!hotelId) return false;
  let cached = isDemoCache.get(hotelId);
  if (cached === undefined) {
    const hotel = await db.queryOne('SELECT slug FROM hotels WHERE id = ?', [hotelId]);
    cached = hotel?.slug === DEMO_HOTEL_SLUG;
    if (isDemoCache.size > 1000) isDemoCache.clear();
    isDemoCache.set(hotelId, cached);
  }
  return cached;
}

async function ensureReferenceData() {
  // Currencies + exchange rates (shared, ON CONFLICT-safe) so a fresh DB
  // that only ran migrations still has what the demo screens expect.
  const currencies = [
    { code: 'GHS', name: 'Ghana Cedi', symbol: 'GHs' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
  ];
  for (const c of currencies) {
    await db.execute('INSERT INTO currencies (code, name, symbol) VALUES (?, ?, ?) ON CONFLICT (code) DO NOTHING', [c.code, c.name, c.symbol]);
  }
  const rates = [
    { from: 'USD', to: 'GHS', rate: 15.50 }, { from: 'GHS', to: 'USD', rate: 0.065 },
    { from: 'GHS', to: 'GHS', rate: 1 }, { from: 'USD', to: 'USD', rate: 1 },
  ];
  for (const r of rates) {
    await db.execute('INSERT INTO exchange_rates (from_currency, to_currency, rate) VALUES (?, ?, ?) ON CONFLICT (from_currency, to_currency) DO NOTHING', [r.from, r.to, r.rate]);
  }
}

async function resolvePlanId(): Promise<string> {
  // Prefer the paid "Hotel" plan so the demo shows the full experience and
  // never trips the subscription gate. Fall back to whatever exists.
  const plan = await db.queryOne("SELECT id FROM subscription_plans WHERE slug IN ('professional', 'basic') ORDER BY CASE slug WHEN 'professional' THEN 0 ELSE 1 END LIMIT 1");
  if (plan) return (plan as any).id;
  // Last resort: create the plan (same shape as seed.ts / migration 0007).
  const id = uuid();
  await db.execute(
    `INSERT INTO subscription_plans (id, name, slug, description, price_monthly, price_yearly, max_rooms, max_users, features, highlighted, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true, 3)`,
    [id, 'Hotel', 'professional', 'Complete solution for hotels that want to grow — payments, payroll and reports included.',
     500, 5000, 50, 20, JSON.stringify(['Up to 50 rooms', 'Up to 20 users', 'Everything in Guesthouse', 'Mobile money & card payments', 'Payroll & staff management', 'Full reports & exports', 'Priority WhatsApp support'])]
  );
  return id;
}

export async function seedDemoTenant(): Promise<void> {
  await initDb();
  await ensureReferenceData();

  // Idempotent on purpose: recreate from scratch every run.
  const existing = await findDemoHotel();
  if (existing) await wipeDemoTenant(existing.id);

  const hotelId = uuid();
  await db.execute(
    `INSERT INTO hotels (id, name, slug, email, phone, address, currency, tax_rate, timezone, check_in_time, check_out_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [hotelId, 'Golden Sands Hotel', DEMO_HOTEL_SLUG, 'stay@goldensands-gh.com', '+233 30 276 5432',
     '12 Oxford Street, Osu, Accra', 'GHS', 15, 'Africa/Accra', '14:00', '11:00']
  );

  // Ghana taxes (matches seed.ts set)
  const taxes = [
    { name: 'VAT', rate: 15.0, is_mandatory: true },
    { name: 'NHIL', rate: 2.5, is_mandatory: true },
    { name: 'GetFund', rate: 2.5, is_mandatory: true },
    { name: 'COVID-19 Levy', rate: 1.0, is_mandatory: true },
    { name: 'Tourism Levy', rate: 1.0, is_mandatory: false },
  ];
  for (const t of taxes) {
    await db.execute(
      'INSERT INTO hotel_taxes (id, hotel_id, name, rate, type, is_mandatory) VALUES (?, ?, ?, ?, ?, ?)',
      [uuid(), hotelId, t.name, t.rate, 'percentage', t.is_mandatory]
    );
  }

  // Active subscription — the demo must never hit the 402 lock.
  const planId = await resolvePlanId();
  const periodEnd = new Date(); periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  await db.execute(
    `INSERT INTO hotel_subscriptions (id, hotel_id, plan_id, billing_interval, status, current_period_ends_at)
     VALUES (?, ?, ?, 'monthly', 'active', ?)`,
    [uuid(), hotelId, planId, fmtDay(periodEnd)]
  );

  // Demo users (landing-visible credentials)
  const adminId = uuid();
  const ownerId = uuid();
  await db.execute(
    'INSERT INTO users (id, hotel_id, username, email, password_hash, name, role, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, true)',
    [adminId, hotelId, DEMO_ADMIN, 'demo.admin@hotelease.com', bcrypt.hashSync(DEMO_PASSWORD, 10), 'Demo Manager', 'admin']
  );
  await db.execute(
    'INSERT INTO users (id, hotel_id, username, email, password_hash, name, role, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, true)',
    [ownerId, hotelId, DEMO_OWNER, 'demo.owner@hotelease.com', bcrypt.hashSync(DEMO_PASSWORD, 10), 'Demo Owner', 'owner']
  );
  await db.execute('INSERT INTO hotel_members (id, user_id, hotel_id, role) VALUES (?, ?, ?, ?) ON CONFLICT (user_id, hotel_id) DO NOTHING', [uuid(), adminId, hotelId, 'admin']);
  await db.execute('INSERT INTO hotel_members (id, user_id, hotel_id, role) VALUES (?, ?, ?, ?) ON CONFLICT (user_id, hotel_id) DO NOTHING', [uuid(), ownerId, hotelId, 'owner']);

  const roomTypes = [
    { name: 'Standard Room', base_price: 450, capacity: 2, description: 'Comfortable room with queen bed, city-facing window, AC and fast Wi-Fi.' },
    { name: 'Superior Twin', base_price: 550, capacity: 2, description: 'Two soft twin beds and a work desk — perfect for friends or colleagues sharing.' },
    { name: 'Deluxe Room', base_price: 700, capacity: 2, description: 'Spacious deluxe room with king bed, balcony and daily breakfast for two included.' },
    { name: 'Executive Room', base_price: 950, capacity: 2, description: 'Business-ready room with lounge chair, espresso machine and evening turndown.' },
    { name: 'Family Suite', base_price: 1200, capacity: 4, description: 'Two bedrooms, a sitting area and kitchenette — built for families travelling together.' },
    { name: 'Presidential Suite', base_price: 2000, capacity: 4, description: 'The signature suite: panoramic terrace, living room, dining area and butler service.' },
  ];
  const rtIds: string[] = [];
  for (const rt of roomTypes) {
    const id = uuid();
    rtIds.push(id);
    await db.execute(
      'INSERT INTO room_types (id, hotel_id, name, description, base_price, capacity) VALUES (?, ?, ?, ?, ?, ?)',
      [id, hotelId, rt.name, rt.description, rt.base_price, rt.capacity]
    );
  }

  const rooms: any[] = [
    { n: '101', t: 0, f: 1, am: 'WiFi, TV, AC', nt: 'Street-facing, quiet' },
    { n: '102', t: 0, f: 1, am: 'WiFi, TV, AC, Fridge', nt: '' },
    { n: '103', t: 1, f: 1, am: 'WiFi, TV, AC, Desk', nt: 'Near lift' },
    { n: '104', t: 2, f: 1, am: 'WiFi, TV, AC, Balcony', nt: 'Garden view' },
    { n: '201', t: 2, f: 2, am: 'WiFi, TV, AC, Fridge, Safe', nt: '' },
    { n: '202', t: 1, f: 2, am: 'WiFi, TV, AC, Desk', nt: '' },
    { n: '203', t: 3, f: 2, am: 'WiFi, TV, AC, Espresso, Balcony', nt: 'Oxford Street view' },
    { n: '204', t: 2, f: 2, am: 'WiFi, TV, AC, Bathtub', nt: '' },
    { n: '301', t: 4, f: 3, am: 'WiFi, TV, AC, Kitchenette, Sofa', nt: 'Connecting rooms' },
    { n: '302', t: 3, f: 3, am: 'WiFi, TV, AC, Lounge Chair', nt: '' },
    { n: '303', t: 4, f: 3, am: 'WiFi, TV, AC, 2 Bedrooms, Kitchen', nt: '' },
    { n: '304', t: 3, f: 3, am: 'WiFi, TV, AC, Balcony', nt: '' },
    { n: '401', t: 5, f: 4, am: 'WiFi, TV, AC, Terrace, Living Room, Butler', nt: 'Top floor, panoramic' },
    { n: '402', t: 0, f: 4, am: 'WiFi, TV, AC', nt: 'Budget top floor' },
  ];
  for (const r of rooms) {
    r.id = uuid();
    await db.execute(
      'INSERT INTO rooms (id, hotel_id, room_number, room_type_id, floor, status, amenities, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [r.id, hotelId, r.n, rtIds[r.t], r.f, 'available', r.am, r.nt]
    );
  }

  const guests = [
    ['Akua', 'Mensah', 'akua.mensah@gmail.com', '+233 24 555 0101', 'GHS-1902-4417', 'East Legon, Accra'],
    ['Kofi', 'Boateng', 'kofi.boateng@gmail.com', '+233 20 555 0102', 'GHS-3301-8204', 'Tema, Greater Accra'],
    ['Ama', 'Serwaa', 'ama.serwaa@gmail.com', '+233 55 555 0103', 'GHS-7747-1003', 'Kumasi, Ashanti'],
    ['Yaw', 'Boakye', 'yaw.boakye@gmail.com', '+233 27 555 0104', 'GHS-5521-9688', 'Sekondi-Takoradi'],
    ['Efua', 'Asante', 'efua.asante@gmail.com', '+233 50 555 0105', 'GHS-8813-2205', 'Cape Coast, Central'],
    ['Kwame', 'Osei', 'kwame.osei@gmail.com', '+233 26 555 0106', 'GHS-2209-7710', 'Airport Residential, Accra'],
  ] as const;
  const guestIds: string[] = [];
  for (const g of guests) {
    const id = uuid();
    guestIds.push(id);
    await db.execute(
      'INSERT INTO guests (id, hotel_id, first_name, last_name, email, phone, id_card_number, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, hotelId, g[0], g[1], g[2], g[3], g[4], g[5]]
    );
  }

  const services = [
    { name: 'Breakfast Buffet', price: 120, category: 'food' },
    { name: 'Airport Pickup', price: 400, category: 'transport' },
    { name: 'Laundry (per bag)', price: 90, category: 'laundry' },
    { name: 'Traditional Massage', price: 280, category: 'spa' },
    { name: 'Late Check-out (2pm)', price: 150, category: 'general' },
    { name: 'Jollof Night Dinner', price: 180, category: 'food' },
  ];
  const serviceIds: string[] = [];
  for (const s of services) {
    const id = uuid();
    serviceIds.push(id);
    await db.execute(
      'INSERT INTO services (id, hotel_id, name, description, price, category) VALUES (?, ?, ?, ?, ?, ?)',
      [id, hotelId, s.name, '', s.price, s.category]
    );
  }

  const today = new Date();
  const future = (days: number) => { const d = new Date(today); d.setDate(d.getDate() + days); return fmtDay(d); };
  const past = (days: number) => { const d = new Date(today); d.setDate(d.getDate() - days); return fmtDay(d); };

  // Current bookings — demo staff can check guests in/out right away.
  const liveBookings = [
    { g: 0, r: 0, ci: future(1), co: future(3), source: 'online', status: 'confirmed' },
    { g: 1, r: 2, ci: past(1), co: future(2), source: 'walk_in', status: 'checked_in' },
    { g: 2, r: 5, ci: past(2), co: future(1), source: 'online', status: 'checked_in' },
    { g: 3, r: 4, ci: future(4), co: future(7), source: 'phone', status: 'confirmed' },
    { g: 4, r: 8, ci: future(6), co: future(9), source: 'online', status: 'confirmed' },
    { g: 5, r: 6, ci: future(10), co: future(14), source: 'corporate', status: 'pending' },
    { g: 0, r: 1, ci: past(9), co: past(7), source: 'online', status: 'checked_out' },
    { g: 2, r: 11, ci: past(6), co: past(4), source: 'walk_in', status: 'cancelled' },
    { g: 1, r: 13, ci: past(5), co: past(3), source: 'phone', status: 'checked_out' },
    { g: 3, r: 9, ci: past(1), co: past(1), source: 'group', status: 'no_show' },
  ];

  const occupied = new Map<string, Array<{ in: string; out: string }>>();
  for (const b of liveBookings) {
    if (b.status === 'confirmed' || b.status === 'checked_in') {
      if (b.r < 0) continue; // no_show guard above
      const roomId = rooms[b.r].id;
      if (!occupied.has(roomId)) occupied.set(roomId, []);
      occupied.get(roomId)!.push({ in: b.ci, out: b.co });
    }
  }
  const isFree = (roomId: string, ci: Date, co: Date) =>
    !(occupied.get(roomId) || []).some(iv => ci < new Date(iv.out) && new Date(iv.in) < co);

  let checkedOutCount = 0;
  for (const b of liveBookings) {
    const room = b.r >= 0 ? rooms[b.r] : null;
    const basePrice = roomTypes[room ? room.t : 0].base_price;
    const nights = Math.max(1, Math.ceil((new Date(b.co).getTime() - new Date(b.ci).getTime()) / 86400000));
    const total = nights * basePrice;
    const bid = uuid();
    await db.execute(
      'INSERT INTO bookings (id, hotel_id, guest_id, room_id, check_in_date, check_out_date, total_amount, source, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [bid, hotelId, guestIds[b.g], room?.id ?? null, b.ci, b.co, total, b.source, b.status]
    );
    if (b.status === 'checked_out') {
      const paid = checkedOutCount % 3 === 2 ? Math.round(total / 2) : total;
      await db.execute(
        'INSERT INTO invoices (id, hotel_id, booking_id, amount, paid_amount, status, issued_date, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [uuid(), hotelId, bid, total, paid, paid >= total ? 'paid' : 'partial', b.ci, today.toISOString().split('T')[0]]
      );
      if (paid > 0) {
        const method = checkedOutCount % 2 === 0 ? 'mobile_money' : 'cash';
        const invoiceId = (await db.queryOne('SELECT id FROM invoices WHERE booking_id = ?', [bid]) as any).id;
        await db.execute('INSERT INTO payments (id, invoice_id, amount, method, reference) VALUES (?, ?, ?, ?, ?)', [uuid(), invoiceId, paid, method, 'MOMO-' + Math.random().toString(36).slice(2, 8).toUpperCase()]);
      }
      checkedOutCount++;
    } else if (b.status !== 'no_show') {
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 7);
      await db.execute(
        'INSERT INTO invoices (id, hotel_id, booking_id, amount, issued_date, due_date) VALUES (?, ?, ?, ?, ?, ?)',
        [uuid(), hotelId, bid, total, b.ci, dueDate.toISOString().split('T')[0]]
      );
    }
  }
  // Reflect live states on rooms
  await db.execute("UPDATE rooms SET status = 'occupied' WHERE id = ?", [rooms[2].id]);
  await db.execute("UPDATE rooms SET status = 'occupied' WHERE id = ?", [rooms[5].id]);
  await db.execute("UPDATE rooms SET status = 'cleaning' WHERE id = ?", [rooms[1].id]);
  await db.execute("UPDATE rooms SET status = 'maintenance' WHERE id = ?", [rooms[12].id]);

  // 12 months of history so charts look alive
  const allRooms = rooms.map(r => ({ id: r.id, base_price: roomTypes[r.t].base_price }));
  const sources = ['walk_in', 'online', 'phone', 'corporate', 'group'];
  const expenseCats = ['utilities', 'supplies', 'maintenance', 'salary', 'marketing', 'food', 'transport', 'other'];
  const expenseDescs: Record<string, string[]> = {
    utilities: ['ECG electricity bill', 'Ghana Water bill', ' DSTV subscription', 'Internet (Vodafone fibre)'],
    supplies: ['Cleaning supplies', 'Guest toiletries', 'Bed sheets order', 'Kitchen provisions (Makola market)'],
    maintenance: ['Generator servicing', 'AC service', 'Plumbing repair', 'Paint touch-up'],
    salary: ['Staff salaries', 'Night guard wages', 'Kitchen staff wages'],
    marketing: ['Instagram ads', 'Radio advert (Joy FM)', 'Printed flyers', 'Website maintenance'],
    food: ['Restaurant provisions', 'Bar stock', 'Breakfast supplies'],
    transport: ['Guest shuttle fuel', 'Trotro deliveries', 'Parking maintenance'],
    other: ['Business operating permit (AMA)', 'Tourism levy licensing', 'Insurance premium'],
  };
  const amounts = [300, 500, 750, 1000, 1200, 1500, 2000, 2500, 3000];

  let histBookings = 0, histExpenses = 0;
  for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
    const m = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
    const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();

    const numBookings = 2 + Math.floor(Math.random() * 3);
    for (let b = 0; b < numBookings; b++) {
      const checkInDay = 1 + Math.floor(Math.random() * (daysInMonth - 3));
      const stay = 1 + Math.floor(Math.random() * 5);
      const ci = new Date(m.getFullYear(), m.getMonth(), checkInDay);
      const co = new Date(m.getFullYear(), m.getMonth(), checkInDay + stay);
      let room = allRooms[Math.floor(Math.random() * allRooms.length)];
      let fits = isFree(room.id, ci, co);
      for (let attempt = 0; attempt < 20 && !fits; attempt++) {
        room = allRooms[Math.floor(Math.random() * allRooms.length)];
        fits = isFree(room.id, ci, co);
      }
      if (!fits) continue;

      const nightsN = Math.max(1, Math.round((co.getTime() - ci.getTime()) / 86400000));
      const total = nightsN * room.base_price;
      const isPast = co < today, isFuture = ci > today;
      let status: string;
      if (isPast) {
        const roll = Math.random();
        status = roll > 0.18 ? 'checked_out' : roll > 0.08 ? 'cancelled' : 'no_show';
      } else if (isFuture) {
        status = Math.random() > 0.25 ? 'confirmed' : 'pending';
      } else {
        status = 'checked_in';
      }
      const bid = uuid();
      await db.execute(
        'INSERT INTO bookings (id, hotel_id, guest_id, room_id, check_in_date, check_out_date, total_amount, source, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [bid, hotelId, guestIds[Math.floor(Math.random() * guestIds.length)], room.id, fmtDay(ci), fmtDay(co), total, sources[Math.floor(Math.random() * sources.length)], status, fmtDay(ci)]
      );
      histBookings++;
      if (status === 'confirmed' || status === 'checked_in') {
        const list = occupied.get(room.id) || [];
        list.push({ in: fmtDay(ci), out: fmtDay(co) });
        occupied.set(room.id, list);
        const dueDate = new Date(co.getTime() + 7 * 86400000);
        await db.execute(
          'INSERT INTO invoices (id, hotel_id, booking_id, amount, issued_date, due_date) VALUES (?, ?, ?, ?, ?, ?)',
          [uuid(), hotelId, bid, total, fmtDay(ci), fmtDay(dueDate)]
        );
      } else if (status === 'checked_out') {
        const invId = uuid();
        const paid = Math.random() > 0.12 ? total : Math.round(total * 0.5);
        await db.execute(
          'INSERT INTO invoices (id, hotel_id, booking_id, amount, paid_amount, status, issued_date, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [invId, hotelId, bid, total, paid, paid >= total ? 'paid' : 'partial', fmtDay(ci), fmtDay(co)]
        );
        if (paid > 0) {
          const methods = ['cash', 'mobile_money', 'card', 'bank_transfer'];
          await db.execute(
            'INSERT INTO payments (id, invoice_id, amount, method, reference) VALUES (?, ?, ?, ?, ?)',
            [uuid(), invId, paid, methods[Math.floor(Math.random() * methods.length)], 'TXN-' + Math.random().toString(36).slice(2, 8).toUpperCase()]
          );
        }
      }
    }

    const numExpenses = 2 + Math.floor(Math.random() * 2);
    for (let e = 0; e < numExpenses; e++) {
      const day = 1 + Math.floor(Math.random() * daysInMonth);
      const expDate = new Date(m.getFullYear(), m.getMonth(), day);
      const cat = expenseCats[Math.floor(Math.random() * expenseCats.length)];
      const descs = expenseDescs[cat];
      await db.execute(
        'INSERT INTO expenses (id, hotel_id, category, description, amount, date) VALUES (?, ?, ?, ?, ?, ?)',
        [uuid(), hotelId, cat, descs[Math.floor(Math.random() * descs.length)].trim(), amounts[Math.floor(Math.random() * amounts.length)], fmtDay(expDate)]
      );
      histExpenses++;
    }
  }

  // Departments + employees
  const departments = [
    { name: 'Housekeeping', description: 'Room cleaning and upkeep' },
    { name: 'Maintenance', description: 'Building and equipment repairs' },
    { name: 'Food & Beverage', description: 'Kitchen and restaurant' },
    { name: 'Front Desk', description: 'Reception and guest services' },
  ];
  const deptIds: string[] = [];
  for (const d of departments) {
    const id = uuid();
    deptIds.push(id);
    await db.execute('INSERT INTO departments (id, hotel_id, name, description) VALUES (?, ?, ?, ?)', [id, hotelId, d.name, d.description]);
  }
  const employees = [
    { dept: 0, first: 'Ama', last: 'Tutu', email: 'ama.tutu@goldensands-gh.com', phone: '+233 24 100 2001', pos: 'Head Housekeeper', rate: 30 },
    { dept: 0, first: 'Abena', last: 'Owusu', email: 'abena.owusu@goldensands-gh.com', phone: '+233 24 100 2002', pos: 'Housekeeper', rate: 22 },
    { dept: 1, first: 'Kwesi', last: 'Amoah', email: 'kwesi.amoah@goldensands-gh.com', phone: '+233 24 100 2003', pos: 'Maintenance Technician', rate: 32 },
    { dept: 2, first: 'Adjoa', last: 'Quaye', email: 'adjoa.quaye@goldensands-gh.com', phone: '+233 24 100 2004', pos: 'Head Chef', rate: 40 },
    { dept: 3, first: 'Nana', last: 'Darkwa', email: 'nana.darkwa@goldensands-gh.com', phone: '+233 24 100 2005', pos: 'Front Desk Supervisor', rate: 28 },
  ];
  const employeeIds: string[] = [];
  for (const e of employees) {
    const id = uuid();
    employeeIds.push(id);
    await db.execute(
      'INSERT INTO employees (id, hotel_id, department_id, first_name, last_name, email, phone, position, hourly_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, hotelId, deptIds[e.dept], e.first, e.last, e.email, e.phone, e.pos, e.rate]
    );
  }

  // Payroll (SSNIT + PAYE, like seed.ts)
  const deductions = [
    { name: 'Social Security (SSNIT)', value: 5.5, mandatory: true },
    { name: 'Income Tax (PAYE)', value: 10, mandatory: true },
    { name: 'Provident Fund', value: 5, mandatory: false },
  ];
  for (const d of deductions) {
    await db.execute(
      'INSERT INTO payroll_deductions (id, hotel_id, name, type, value, is_mandatory) VALUES (?, ?, ?, ?, ?, ?)',
      [uuid(), hotelId, d.name, 'percentage', d.value, d.mandatory]
    );
  }
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  const periodId = uuid();
  await db.execute('INSERT INTO payroll_periods (id, hotel_id, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)', [periodId, hotelId, monthStart, monthEnd, 'open']);
  for (const [idx, e] of employees.entries()) {
    const basePay = e.rate * 160;
    const deds = [
      { name: 'SSNIT', amount: Math.round(basePay * 0.055 * 100) / 100 },
      { name: 'PAYE', amount: Math.round(basePay * 0.10 * 100) / 100 },
    ];
    const dedTotal = deds.reduce((s, d) => s + d.amount, 0);
    const net = Math.round((basePay - dedTotal) * 100) / 100;
    const entryId = uuid();
    await db.execute(
      'INSERT INTO payroll_entries (id, hotel_id, period_id, employee_id, base_pay, overtime_pay, bonuses, deductions_total, net_pay) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?)',
      [entryId, hotelId, periodId, employeeIds[idx], basePay, dedTotal, net]
    );
    await db.execute(
      'INSERT INTO payslips (id, entry_id, hotel_id, employee_id, period_id, gross_pay, deductions_breakdown, net_pay) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid(), entryId, hotelId, employeeIds[idx], periodId, basePay, JSON.stringify(deds), net]
    );
  }

  // Housekeeping + maintenance + room service
  const hkTasks = [
    { room: rooms[1].id, assign: employeeIds[1], priority: 'high', date: fmtDay(today), notes: 'Deep clean after checkout' },
    { room: rooms[3].id, assign: employeeIds[0], priority: 'medium', date: fmtDay(today), notes: 'Daily cleaning' },
    { room: rooms[4].id, assign: employeeIds[1], priority: 'medium', date: future(1), notes: 'Prepare for arrival' },
  ];
  for (const t of hkTasks) {
    await db.execute(
      'INSERT INTO housekeeping_tasks (id, hotel_id, room_id, assigned_to, priority, scheduled_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuid(), hotelId, t.room, t.assign, t.priority, t.date, t.notes]
    );
  }
  const maint = [
    { room: rooms[12].id, title: 'AC not cooling', desc: 'Room 401 AC blowing warm air', priority: 'urgent', status: 'in_progress', assigned: employeeIds[2] },
    { room: rooms[0].id, title: 'Leaky faucet', desc: 'Bathroom faucet dripping', priority: 'medium', status: 'reported', assigned: null },
  ];
  for (const m of maint) {
    await db.execute(
      'INSERT INTO maintenance_requests (id, hotel_id, room_id, reported_by, title, description, priority, status, assigned_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid(), hotelId, m.room, employeeIds[0], m.title, m.desc, m.priority, m.status, m.assigned]
    );
  }
  const rsRequests = [
    { room: rooms[5].id, guest: 'Ama Serwaa', type: 'food', desc: 'Continental breakfast at 7:30 AM', status: 'delivered' },
    { room: rooms[2].id, guest: 'Kofi Boateng', type: 'towels', desc: 'Extra towels requested', status: 'pending' },
  ];
  for (const r of rsRequests) {
    await db.execute(
      'INSERT INTO room_service_requests (id, hotel_id, room_id, guest_name, request_type, description, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuid(), hotelId, r.room, r.guest, r.type, r.desc, r.status]
    );
  }

  // A corporate client with a negotiated rate
  const corpId = uuid();
  await db.execute(
    'INSERT INTO corporate_accounts (id, hotel_id, company_name, contact_name, contact_email, contact_phone, credit_limit, payment_terms, discount_rate, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [corpId, hotelId, 'Tema Ports Logistics Ltd', 'Yaw Boakye', 'ops@temaports.com', '+233 30 300 4000', 40000, 'net30', 10, 'Weekly engineers on site trips']
  );
  await db.execute(
    'INSERT INTO corporate_rates (id, account_id, room_type_id, negotiated_price, valid_from) VALUES (?, ?, ?, ?, ?)',
    [uuid(), corpId, rtIds[0], roomTypes[0].base_price * 0.85, fmtDay(today)]
  );

  // Integrations + white-label
  const integrations = [
    { type: 'channel_manager', provider: 'bookingdotcom', name: 'Booking.com', enabled: true },
    { type: 'payment_gateway', provider: 'paystack', name: 'Paystack', enabled: true },
  ];
  for (const si of integrations) {
    await db.execute('INSERT INTO integrations (id, hotel_id, type, provider, name, enabled) VALUES (?, ?, ?, ?, ?, ?)', [uuid(), hotelId, si.type, si.provider, si.name, si.enabled]);
  }
  await db.execute(
    'INSERT INTO white_label_settings (id, hotel_id, primary_color, footer_text) VALUES (?, ?, ?, ?)',
    [uuid(), hotelId, '#c8a44e', 'Powered by HotelEase']
  );
  await db.execute(
    'INSERT INTO custom_roles (id, hotel_id, name, permissions) VALUES (?, ?, ?, ?)',
    [uuid(), hotelId, 'Night Auditor', JSON.stringify(['bookings.view', 'bookings.edit', 'guests.view', 'reports.view'])]
  );

  console.log(`Demo tenant ready: ${DEMO_HOTEL_SLUG} (${hotelId})`);
  console.log(`- users: ${DEMO_ADMIN}/${DEMO_PASSWORD} (admin), ${DEMO_OWNER}/${DEMO_PASSWORD} (owner)`);
  console.log(`- ${roomTypes.length} room types, ${rooms.length} rooms, ${guestIds.length} guests`);
  console.log(`- ${liveBookings.length} live bookings + ${histBookings} historical, ${histExpenses} historical expenses`);
  console.log(`- active subscription on the paid plan`);
}
