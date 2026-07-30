import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { initDb, getDb } from './db.js';

async function seed() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED_IN_PRODUCTION !== 'true') {
    console.error(
      'Refusing to seed: NODE_ENV=production. This inserts a demo hotel with well-known ' +
      'admin/owner passwords (admin123/owner123). Set ALLOW_SEED_IN_PRODUCTION=true if you ' +
      'really want demo data on this database.'
    );
    process.exit(1);
  }

  await initDb();
  const db = getDb();

  const existing = await db.queryAll('SELECT COUNT(*) as count FROM hotels');
  if (existing[0]?.count > 0) {
    console.log('Database already has data, skipping seed.');
    process.exit(0);
  }

  const hotelId = uuid();
  await db.execute(
    `INSERT INTO hotels (id, name, slug, email, phone, address, currency, tax_rate, timezone, check_in_time, check_out_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [hotelId, 'Grand Hotel Ease', 'grand-hotel-ease', 'info@grandhotel.com', '+1-555-0000', '100 Main St, New York, NY',
     'USD', 10.5, 'America/New_York', '15:00', '11:00']
  );

  // Currencies and exchange rates
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
  const baseRates = [
    { from: 'USD', to: 'GHS', rate: 15.50 }, { from: 'USD', to: 'NGN', rate: 1550 },
    { from: 'USD', to: 'EUR', rate: 0.92 }, { from: 'USD', to: 'GBP', rate: 0.79 },
    { from: 'GHS', to: 'USD', rate: 0.065 }, { from: 'GHS', to: 'NGN', rate: 100 },
    { from: 'GHS', to: 'EUR', rate: 0.059 }, { from: 'GHS', to: 'GBP', rate: 0.051 },
    { from: 'GHS', to: 'GHS', rate: 1 }, { from: 'USD', to: 'USD', rate: 1 },
    { from: 'NGN', to: 'NGN', rate: 1 }, { from: 'EUR', to: 'EUR', rate: 1 },
    { from: 'GBP', to: 'GBP', rate: 1 },
  ];
  for (const r of baseRates) {
    await db.execute('INSERT INTO exchange_rates (from_currency, to_currency, rate) VALUES (?, ?, ?) ON CONFLICT (from_currency, to_currency) DO NOTHING', [r.from, r.to, r.rate]);
  }

  // Ghana taxes
  const ghanaTaxes = [
    { id: uuid(), name: 'VAT', rate: 15.0, type: 'percentage', is_mandatory: true },
    { id: uuid(), name: 'NHIL', rate: 2.5, type: 'percentage', is_mandatory: true },
    { id: uuid(), name: 'GetFund', rate: 2.5, type: 'percentage', is_mandatory: true },
    { id: uuid(), name: 'COVID-19 Levy', rate: 1.0, type: 'percentage', is_mandatory: true },
    { id: uuid(), name: 'Tourism Levy', rate: 0.0, type: 'percentage', is_mandatory: false },
  ];
  for (const t of ghanaTaxes) {
    await db.execute(
      'INSERT INTO hotel_taxes (id, hotel_id, name, rate, type, is_mandatory) VALUES (?, ?, ?, ?, ?, ?)',
      [t.id, hotelId, t.name, t.rate, t.type, t.is_mandatory]
    );
  }

  // Subscription plans
  const plans = [
    { id: uuid(), name: 'Free Trial', slug: 'free_trial', description: 'Get started with basic hotel management features. Perfect for testing the platform.', price_monthly: 0, price_yearly: 0, max_rooms: 5, max_users: 2, features: JSON.stringify(['Up to 5 rooms', 'Up to 2 users', 'Basic dashboard', 'Manual bookings', 'Email support']), highlighted: false, sort_order: 1 },
    { id: uuid(), name: 'Basic', slug: 'basic', description: 'Essential tools for small hotels and B&Bs to manage daily operations.', price_monthly: 29, price_yearly: 290, max_rooms: 20, max_users: 5, features: JSON.stringify(['Up to 20 rooms', 'Up to 5 users', 'Dashboard & reports', 'Online bookings', 'Guest management', 'Invoice generation', 'Email support']), highlighted: false, sort_order: 2 },
    { id: uuid(), name: 'Professional', slug: 'professional', description: 'Complete solution for growing hotels with advanced features and integrations.', price_monthly: 79, price_yearly: 790, max_rooms: 100, max_users: 20, features: JSON.stringify(['Up to 100 rooms', 'Up to 20 users', 'Advanced analytics', 'Housekeeping module', 'Maintenance tracking', 'Room service management', 'Staff scheduling', 'Export reports (CSV/PDF)', 'Priority email support']), highlighted: true, sort_order: 3 },
    { id: uuid(), name: 'Enterprise', slug: 'enterprise', description: 'Unlimited everything with dedicated support and custom integrations for large properties.', price_monthly: 199, price_yearly: 1990, max_rooms: 9999, max_users: 9999, features: JSON.stringify(['Unlimited rooms', 'Unlimited users', 'All Professional features', 'API access', 'Multi-property management', 'Custom integrations', 'Dedicated account manager', 'Phone & priority support', 'SLA guarantee']), highlighted: false, sort_order: 4 },
  ];

  for (const p of plans) {
    await db.execute(
      'INSERT INTO subscription_plans (id, name, slug, description, price_monthly, price_yearly, max_rooms, max_users, features, highlighted, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [p.id, p.name, p.slug, p.description, p.price_monthly, p.price_yearly, p.max_rooms, p.max_users, p.features, p.highlighted, p.sort_order]
    );
  }

  // Assign Free Trial to the hotel on seed
  const freePlan = plans[0];
  const subId = uuid();
  const periodEnd = new Date(); periodEnd.setDate(periodEnd.getDate() + 14);
  await db.execute(
    `INSERT INTO hotel_subscriptions (id, hotel_id, plan_id, billing_interval, status, trial_ends_at, current_period_ends_at)
     VALUES (?, ?, ?, 'monthly', 'trial', NOW() + INTERVAL '14 days', ?)`,
    [subId, hotelId, freePlan.id, periodEnd.toISOString().split('T')[0]]
  );

  const adminId = uuid();
  const ownerId = uuid();
  await db.execute(
    'INSERT INTO users (id, hotel_id, username, email, password_hash, name, role, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, true)',
    [adminId, hotelId, 'admin', 'admin@hotelease.com', bcrypt.hashSync('admin123', 10), 'Admin User', 'admin']
  );
  await db.execute(
    'INSERT INTO users (id, hotel_id, username, email, password_hash, name, role, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, true)',
    [ownerId, hotelId, 'owner', 'owner@hotelease.com', bcrypt.hashSync('owner123', 10), 'Hotel Owner', 'owner']
  );

  await db.execute('INSERT INTO hotel_members (id, user_id, hotel_id, role) VALUES (?, ?, ?, ?) ON CONFLICT (user_id, hotel_id) DO NOTHING', [uuid(), adminId, hotelId, 'admin']);
  await db.execute('INSERT INTO hotel_members (id, user_id, hotel_id, role) VALUES (?, ?, ?, ?) ON CONFLICT (user_id, hotel_id) DO NOTHING', [uuid(), ownerId, hotelId, 'owner']);

  const roomTypes = [
    { id: uuid(), name: 'Single', base_price: 300, capacity: 1, description: 'Cozy single room with city view' },
    { id: uuid(), name: 'Double', base_price: 450, capacity: 2, description: 'Spacious double room with queen bed' },
    { id: uuid(), name: 'Twin', base_price: 400, capacity: 2, description: 'Two single beds, ideal for friends' },
    { id: uuid(), name: 'Deluxe', base_price: 650, capacity: 2, description: 'Premium room with sea view' },
    { id: uuid(), name: 'Suite', base_price: 1000, capacity: 4, description: 'Luxury suite with living area' },
    { id: uuid(), name: 'Family', base_price: 800, capacity: 5, description: 'Spacious family room with extra beds' },
  ];

  for (const rt of roomTypes) {
    await db.execute(
      'INSERT INTO room_types (id, hotel_id, name, description, base_price, capacity) VALUES (?, ?, ?, ?, ?, ?)',
      [rt.id, hotelId, rt.name, rt.description, rt.base_price, rt.capacity]
    );
  }

  const rooms: any[] = [
    { room_number: '101', room_type_id: roomTypes[0].id, floor: 1, amenities: 'WiFi, TV, AC', notes: 'North-facing, quiet' },
    { room_number: '102', room_type_id: roomTypes[0].id, floor: 1, amenities: 'WiFi, TV, AC, Mini Bar', notes: 'South-facing' },
    { room_number: '103', room_type_id: roomTypes[2].id, floor: 1, amenities: 'WiFi, TV, AC, Desk', notes: 'Adjacent to elevator' },
    { room_number: '104', room_type_id: roomTypes[1].id, floor: 1, amenities: 'WiFi, TV, AC, Balcony', notes: 'Garden view' },
    { room_number: '201', room_type_id: roomTypes[1].id, floor: 2, amenities: 'WiFi, TV, AC, Mini Bar, Safe', notes: '' },
    { room_number: '202', room_type_id: roomTypes[3].id, floor: 2, amenities: 'WiFi, TV, AC, Balcony, Mini Bar, Bathrobe', notes: 'Sea view, premium floor' },
    { room_number: '203', room_type_id: roomTypes[3].id, floor: 2, amenities: 'WiFi, TV, AC, Living Area', notes: 'Corner room' },
    { room_number: '204', room_type_id: roomTypes[2].id, floor: 2, amenities: 'WiFi, TV, AC, Desk, City View', notes: '' },
    { room_number: '301', room_type_id: roomTypes[4].id, floor: 3, amenities: 'WiFi, TV, AC, Living Room, Kitchenette, Jacuzzi', notes: 'Presidential suite' },
    { room_number: '302', room_type_id: roomTypes[4].id, floor: 3, amenities: 'WiFi, TV, AC, Living Area, Dining Table', notes: 'Family suite' },
    { room_number: '303', room_type_id: roomTypes[5].id, floor: 3, amenities: 'WiFi, TV, AC, 2 Bedrooms, Kitchen', notes: 'Connecting rooms available' },
    { room_number: '304', room_type_id: roomTypes[1].id, floor: 3, amenities: 'WiFi, TV, AC, Balcony', notes: 'Mountain view' },
    { room_number: '401', room_type_id: roomTypes[3].id, floor: 4, amenities: 'WiFi, TV, AC, Terrace, Mini Bar', notes: 'Penthouse level, city view' },
    { room_number: '402', room_type_id: roomTypes[0].id, floor: 4, amenities: 'WiFi, TV, AC', notes: 'Budget option, top floor' },
    { room_number: '403', room_type_id: roomTypes[5].id, floor: 4, amenities: 'WiFi, TV, AC, 2 Bathrooms, Living Room', notes: 'Large family suite' },
  ];

  for (const r of rooms) {
    r.id = uuid();
    await db.execute(
      'INSERT INTO rooms (id, hotel_id, room_number, room_type_id, floor, status, amenities, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [r.id, hotelId, r.room_number, r.room_type_id, r.floor, 'available', r.amenities, r.notes]
    );
  }

  const guest1Id = uuid();
  const guest2Id = uuid();
  const guest3Id = uuid();
  const guest4Id = uuid();
  const guest5Id = uuid();
  await db.execute(
    'INSERT INTO guests (id, hotel_id, first_name, last_name, email, phone, id_card_number, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [guest1Id, hotelId, 'John', 'Doe', 'john@example.com', '+1-555-0101', 'ID-12345', '123 Main St, NY']
  );
  await db.execute(
    'INSERT INTO guests (id, hotel_id, first_name, last_name, email, phone, id_card_number, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [guest2Id, hotelId, 'Jane', 'Smith', 'jane@example.com', '+1-555-0102', 'ID-67890', '456 Oak Ave, LA']
  );
  await db.execute(
    'INSERT INTO guests (id, hotel_id, first_name, last_name, email, phone, id_card_number, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [guest3Id, hotelId, 'Robert', 'Johnson', 'robert@example.com', '+1-555-0103', 'ID-11111', '789 Pine Rd, Chicago']
  );
  await db.execute(
    'INSERT INTO guests (id, hotel_id, first_name, last_name, email, phone, id_card_number, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [guest4Id, hotelId, 'Emily', 'Davis', 'emily@example.com', '+1-555-0104', 'ID-22222', '321 Elm St, Boston']
  );
  await db.execute(
    'INSERT INTO guests (id, hotel_id, first_name, last_name, email, phone, id_card_number, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [guest5Id, hotelId, 'Michael', 'Brown', 'michael@example.com', '+1-555-0105', 'ID-33333', '654 Maple Dr, Miami']
  );

  const services = [
    { id: uuid(), name: 'Room Service Breakfast', price: 50, category: 'food' },
    { id: uuid(), name: 'Laundry (per item)', price: 25, category: 'laundry' },
    { id: uuid(), name: 'Spa Session', price: 200, category: 'spa' },
    { id: uuid(), name: 'Airport Transfer', price: 150, category: 'transport' },
    { id: uuid(), name: 'Mini Bar Stock', price: 60, category: 'beverage' },
    { id: uuid(), name: 'Extra Bed', price: 100, category: 'general' },
  ];

  for (const s of services) {
    await db.execute(
      'INSERT INTO services (id, hotel_id, name, description, price, category) VALUES (?, ?, ?, ?, ?, ?)',
      [s.id, hotelId, s.name, '', s.price, s.category]
    );
  }

  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const future = (days: number) => { const d = new Date(today); d.setDate(d.getDate() + days); return fmt(d); };
  const past = (days: number) => { const d = new Date(today); d.setDate(d.getDate() - days); return fmt(d); };

  const sampleBookings: any[] = [
    { guest_id: guest1Id, room_id: rooms[0].id, check_in: future(1), check_out: future(3), source: 'online', status: 'confirmed' },
    { guest_id: guest2Id, room_id: rooms[1].id, check_in: future(2), check_out: future(5), source: 'walk_in', status: 'confirmed' },
    { guest_id: guest1Id, room_id: rooms[4].id, check_in: past(5), check_out: past(3), source: 'phone', status: 'checked_out' },
    { guest_id: guest2Id, room_id: rooms[7].id, check_in: past(2), check_out: future(2), source: 'corporate', status: 'checked_in' },
    { guest_id: guest1Id, room_id: rooms[2].id, check_in: past(1), check_out: past(1), source: 'group', status: 'no_show' },
    { guest_id: guest2Id, room_id: rooms[10].id, check_in: future(10), check_out: future(14), source: 'walk_in', status: 'pending' },
    { guest_id: guest3Id, room_id: rooms[3].id, check_in: future(3), check_out: future(6), source: 'online', status: 'confirmed' },
    { guest_id: guest4Id, room_id: rooms[6].id, check_in: future(5), check_out: future(8), source: 'phone', status: 'confirmed' },
    { guest_id: guest5Id, room_id: rooms[9].id, check_in: past(10), check_out: past(8), source: 'corporate', status: 'checked_out' },
    { guest_id: guest3Id, room_id: rooms[12].id, check_in: past(7), check_out: past(5), source: 'online', status: 'cancelled' },
    { guest_id: guest4Id, room_id: rooms[14].id, check_in: future(7), check_out: future(10), source: 'walk_in', status: 'pending' },
  ];

  for (const b of sampleBookings) {
    const roomData = rooms.find(r => r.id === b.room_id)!;
    const roomTypeData = roomTypes.find(rt => rt.id === roomData.room_type_id)!;
    const checkIn = new Date(b.check_in);
    const checkOut = new Date(b.check_out);
    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
    const total = nights * roomTypeData.base_price;
    const bid = uuid();
    await db.execute(
      'INSERT INTO bookings (id, hotel_id, guest_id, room_id, check_in_date, check_out_date, total_amount, source, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [bid, hotelId, b.guest_id, b.room_id, b.check_in, b.check_out, total, b.source, b.status]
    );
    if (b.status === 'checked_out') {
      await db.execute(
        'INSERT INTO invoices (id, hotel_id, booking_id, amount, paid_amount, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuid(), hotelId, bid, total, total, 'paid', fmt(new Date())]
      );
    } else {
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 7);
      await db.execute(
        'INSERT INTO invoices (id, hotel_id, booking_id, amount, due_date) VALUES (?, ?, ?, ?, ?)',
        [uuid(), hotelId, bid, total, fmt(dueDate)]
      );
    }
  }

  // Update room statuses to match existing bookings
  await db.execute("UPDATE rooms SET status = 'occupied' WHERE id = ?", [sampleBookings[3].room_id]);
  await db.execute("UPDATE rooms SET status = 'maintenance' WHERE id = ?", [rooms[8].id]);
  await db.execute("UPDATE rooms SET status = 'cleaning' WHERE id = ?", [rooms[13].id]);

  // Sample expenses
  const sampleExpenses = [
    { category: 'utilities', description: 'Electricity bill', amount: 1200, date: past(2) },
    { category: 'supplies', description: 'Cleaning supplies', amount: 350, date: past(5) },
    { category: 'maintenance', description: 'AC repair room 201', amount: 800, date: past(3) },
    { category: 'salary', description: 'Staff salaries', amount: 5000, date: past(1) },
    { category: 'food', description: 'Breakfast supplies', amount: 450, date: past(4) },
    { category: 'marketing', description: 'Online ads campaign', amount: 1200, date: past(7) },
    { category: 'transport', description: 'Guest shuttle service', amount: 600, date: past(6) },
    { category: 'utilities', description: 'Water bill', amount: 800, date: past(3) },
    { category: 'salary', description: 'Kitchen staff salaries', amount: 3500, date: past(1) },
    { category: 'supplies', description: 'Towels and linens', amount: 900, date: past(8) },
    { category: 'maintenance', description: 'Elevator maintenance', amount: 1500, date: past(10) },
  ];
  for (const ex of sampleExpenses) {
    await db.execute(
      'INSERT INTO expenses (id, hotel_id, category, description, amount, date) VALUES (?, ?, ?, ?, ?, ?)',
      [uuid(), hotelId, ex.category, ex.description, ex.amount, ex.date]
    );
  }

  // Record payments for the checked_out booking
  const paidInvoice = await db.queryOne("SELECT i.id FROM invoices i JOIN bookings b ON i.booking_id = b.id WHERE b.status = 'checked_out' LIMIT 1");
  if (paidInvoice) {
    await db.execute(
      'INSERT INTO payments (id, invoice_id, amount, method, reference) VALUES (?, ?, ?, ?, ?)',
      [uuid(), paidInvoice.id, 900, 'card', 'TXN-REF-001']
    );
  }

  // Phase 5: Departments
  const departments = [
    { id: uuid(), name: 'Housekeeping', description: 'Room cleaning and maintenance' },
    { id: uuid(), name: 'Maintenance', description: 'Building and equipment repairs' },
    { id: uuid(), name: 'Food & Beverage', description: 'Kitchen and restaurant service' },
    { id: uuid(), name: 'Front Desk', description: 'Reception and guest services' },
  ];
  for (const d of departments) {
    await db.execute('INSERT INTO departments (id, hotel_id, name, description) VALUES (?, ?, ?, ?)',
      [d.id, hotelId, d.name, d.description]);
  }

  // Phase 5: Employees
  const employees = [
    { id: uuid(), dept: departments[0].id, first: 'Maria', last: 'Garcia', email: 'maria@hotelease.com', phone: '+1-555-1001', position: 'Head Housekeeper', rate: 25 },
    { id: uuid(), dept: departments[0].id, first: 'Ana', last: 'Lopez', email: 'ana@hotelease.com', phone: '+1-555-1002', position: 'Housekeeper', rate: 18 },
    { id: uuid(), dept: departments[1].id, first: 'Carlos', last: 'Rivera', email: 'carlos@hotelease.com', phone: '+1-555-1003', position: 'Maintenance Technician', rate: 28 },
    { id: uuid(), dept: departments[2].id, first: 'Sofia', last: 'Chen', email: 'sofia@hotelease.com', phone: '+1-555-1004', position: 'Chef', rate: 30 },
    { id: uuid(), dept: departments[3].id, first: 'James', last: 'Wilson', email: 'james@hotelease.com', phone: '+1-555-1005', position: 'Concierge', rate: 20 },
  ];
  for (const e of employees) {
    await db.execute(
      'INSERT INTO employees (id, hotel_id, department_id, first_name, last_name, email, phone, position, hourly_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [e.id, hotelId, e.dept, e.first, e.last, e.email, e.phone, e.position, e.rate]
    );
  }

  // Phase 5: Shifts
  const fmtDate = (d: Date | string) => typeof d === 'string' ? d : fmt(d);
  const shifts = [
    { emp: employees[0].id, date: fmtDate(today), start: '08:00', end: '16:00', notes: 'Morning shift' },
    { emp: employees[1].id, date: fmtDate(today), start: '08:00', end: '16:00', notes: 'Morning shift' },
    { emp: employees[2].id, date: fmtDate(today), start: '14:00', end: '22:00', notes: 'Afternoon shift' },
  ];
  for (const s of shifts) {
    await db.execute('INSERT INTO shifts (id, hotel_id, employee_id, date, start_time, end_time, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuid(), hotelId, s.emp, s.date, s.start, s.end, s.notes]);
  }

  // Phase 5: Attendance
  const attendanceRecords = [
    { emp: employees[0].id, date: past(1), check_in: '07:55', check_out: '16:05', status: 'present' },
    { emp: employees[1].id, date: past(1), check_in: '08:15', check_out: '16:10', status: 'late' },
    { emp: employees[3].id, date: past(1), check_in: '14:00', check_out: '22:00', status: 'present' },
  ];
  for (const a of attendanceRecords) {
    await db.execute('INSERT INTO attendance (id, hotel_id, employee_id, date, check_in, check_out, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuid(), hotelId, a.emp, a.date, a.check_in, a.check_out, a.status]);
  }

  // Phase 5: Housekeeping tasks
  const hkTasks = [
    { room: rooms[0].id, assign: employees[1].id, priority: 'high', date: fmtDate(today), notes: 'Deep clean after guest checkout' },
    { room: rooms[4].id, assign: employees[0].id, priority: 'medium', date: fmtDate(today), notes: 'Standard daily cleaning' },
    { room: rooms[7].id, assign: employees[1].id, priority: 'medium', date: future(1), notes: 'Prepare for new guest arrival' },
  ];
  for (const t of hkTasks) {
    await db.execute(
      'INSERT INTO housekeeping_tasks (id, hotel_id, room_id, assigned_to, priority, scheduled_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuid(), hotelId, t.room, t.assign, t.priority, t.date, t.notes]);
  }

  // Phase 5: Maintenance requests
  const maintRequests = [
    { room: rooms[5].id, reported: employees[2].id, title: 'AC not cooling', desc: 'Room 202 AC unit blowing warm air', priority: 'urgent', status: 'in_progress', assigned: employees[2].id },
    { room: rooms[2].id, reported: employees[0].id, title: 'Leaky faucet', desc: 'Bathroom sink faucet dripping continuously', priority: 'medium', status: 'reported', assigned: null },
  ];
  for (const m of maintRequests) {
    await db.execute(
      'INSERT INTO maintenance_requests (id, hotel_id, room_id, reported_by, title, description, priority, status, assigned_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid(), hotelId, m.room, m.reported, m.title, m.desc, m.priority, m.status, m.assigned]);
  }

  // Sample deposits
  const sampleBookingsList = await db.queryAll("SELECT id FROM bookings WHERE hotel_id = ?", [hotelId]);
  if (sampleBookingsList.length > 0) {
    await db.execute(
      'INSERT INTO deposits (id, booking_id, amount, method) VALUES (?, ?, ?, ?)',
      [uuid(), sampleBookingsList[0].id, 200, 'card']
    );
    await db.execute(
      'INSERT INTO deposits (id, booking_id, amount, method) VALUES (?, ?, ?, ?)',
      [uuid(), sampleBookingsList[1].id, 150, 'cash']
    );
    const invoiceWithDeposit = await db.queryOne("SELECT id FROM invoices WHERE booking_id = ?", [sampleBookingsList[0].id]);
    if (invoiceWithDeposit) {
      await db.execute('UPDATE invoices SET deposit = 200 WHERE id = ?', [invoiceWithDeposit.id]);
    }
  }

  // Payroll seed
  const payrollDeductions = [
    { id: uuid(), name: 'Social Security (SSNIT)', type: 'percentage', value: 5.5, mandatory: true },
    { id: uuid(), name: 'Income Tax (PAYE)', type: 'percentage', value: 10, mandatory: true },
    { id: uuid(), name: 'Provident Fund', type: 'percentage', value: 5, mandatory: false },
  ];
  for (const d of payrollDeductions) {
    await db.execute('INSERT INTO payroll_deductions (id, hotel_id, name, type, value, is_mandatory) VALUES (?, ?, ?, ?, ?, ?)',
      [d.id, hotelId, d.name, d.type, d.value, d.mandatory]);
  }

  const periodId = uuid();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  await db.execute('INSERT INTO payroll_periods (id, hotel_id, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)',
    [periodId, hotelId, monthStart, monthEnd, 'open']);

  for (const emp of employees) {
    const basePay = (emp.rate || 0) * 160;
    const deds = [
      { name: 'SSNIT', amount: Math.round(basePay * 0.055 * 100) / 100 },
      { name: 'PAYE', amount: Math.round(basePay * 0.10 * 100) / 100 },
    ];
    const dedTotal = deds.reduce((s, d) => s + d.amount, 0);
    const netPay = Math.round((basePay - dedTotal) * 100) / 100;
    const entryId = uuid();
    await db.execute(
      'INSERT INTO payroll_entries (id, hotel_id, period_id, employee_id, base_pay, overtime_pay, bonuses, deductions_total, net_pay) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [entryId, hotelId, periodId, emp.id, basePay, 0, 0, dedTotal, netPay]
    );
    await db.execute(
      'INSERT INTO payslips (id, entry_id, hotel_id, employee_id, period_id, gross_pay, deductions_breakdown, net_pay) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid(), entryId, hotelId, emp.id, periodId, basePay, JSON.stringify(deds), netPay]
    );
  }

  // Phase 5: Room service requests
  const rsRequests = [
    { room: rooms[4].id, guest: 'John Doe', type: 'towels', desc: 'Extra towels requested for room 201', status: 'pending' },
    { room: rooms[7].id, guest: 'Jane Smith', type: 'food', desc: 'Continental breakfast at 7:30 AM', status: 'delivered' },
  ];
  for (const r of rsRequests) {
    await db.execute(
      'INSERT INTO room_service_requests (id, hotel_id, room_id, guest_name, request_type, description, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuid(), hotelId, r.room, r.guest, r.type, r.desc, r.status]);
  }

  // ─────────────────────────────────────────────────────────────
  // Phase 6: Historical data for reports (12 months)
  // ─────────────────────────────────────────────────────────────
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const allGuests = await db.queryAll('SELECT id FROM guests WHERE hotel_id = ?', [hotelId]);
  const allRooms = await db.queryAll('SELECT r.id, rt.base_price FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id WHERE r.hotel_id = ?', [hotelId]);
  const sources = ['walk_in', 'online', 'phone', 'corporate', 'group'];
  const statuses: string[] = ['confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'];
  const expenseCats = ['utilities', 'supplies', 'maintenance', 'salary', 'marketing', 'food', 'transport', 'other'];

  let histBookings = 0;
  let histExpenses = 0;

  for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
    const m = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
    const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const monthStr = months[m.getMonth()];

    // 2-4 bookings per month
    const numBookings = 2 + Math.floor(Math.random() * 3);
    for (let b = 0; b < numBookings; b++) {
      const checkInDay = 1 + Math.floor(Math.random() * (daysInMonth - 3));
      const stay = 1 + Math.floor(Math.random() * 5);
      const checkIn = new Date(m.getFullYear(), m.getMonth(), checkInDay);
      const checkOut = new Date(m.getFullYear(), m.getMonth(), checkInDay + stay);
      const guest = allGuests[Math.floor(Math.random() * allGuests.length)];
      const room = allRooms[Math.floor(Math.random() * allRooms.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      const total = stay * room.base_price;

      const isPast = checkOut < today;
      const isFuture = checkIn > today;
      let status: string;
      if (isPast) {
        status = statuses[Math.floor(Math.random() * 3)]; // checked_out, cancelled, no_show
        if (status === 'no_show' && Math.random() > 0.3) status = 'checked_out';
        if (status === 'checked_out' && Math.random() > 0.15) status = 'checked_out';
      } else if (isFuture) {
        status = Math.random() > 0.2 ? 'confirmed' : 'pending';
      } else {
        status = 'checked_in';
      }
      const bid = uuid();
      await db.execute(
        'INSERT INTO bookings (id, hotel_id, guest_id, room_id, check_in_date, check_out_date, total_amount, source, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [bid, hotelId, guest.id, room.id, fmt(checkIn), fmt(checkOut), total, source, status, fmt(checkIn)]
      );
      histBookings++;

      // Invoice for checked_out bookings
      if (status === 'checked_out') {
        const invId = uuid();
        const paid = Math.random() > 0.1 ? total : Math.round(total * 0.5);
        await db.execute(
          'INSERT INTO invoices (id, hotel_id, booking_id, amount, paid_amount, status, issued_date, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [invId, hotelId, bid, total, paid, paid >= total ? 'paid' : 'partial', fmt(checkIn), fmt(checkOut)]
        );
        if (paid > 0) {
          const methods = ['cash', 'card', 'mobile_money', 'bank_transfer'];
          await db.execute(
            'INSERT INTO payments (id, invoice_id, amount, method, reference) VALUES (?, ?, ?, ?, ?)',
            [uuid(), invId, paid, methods[Math.floor(Math.random() * methods.length)], `TXN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`]
          );
        }
      } else if (status === 'confirmed' || status === 'checked_in' || status === 'pending') {
        await db.execute(
          'INSERT INTO invoices (id, hotel_id, booking_id, amount, issued_date, due_date) VALUES (?, ?, ?, ?, ?, ?)',
          [uuid(), hotelId, bid, total, fmt(checkIn), fmt(new Date(checkOut.getTime() + 7 * 86400000))]
        );
      }
    }

    // 2-3 expenses per month
    const numExpenses = 2 + Math.floor(Math.random() * 2);
    for (let e = 0; e < numExpenses; e++) {
      const day = 1 + Math.floor(Math.random() * daysInMonth);
      const expDate = new Date(m.getFullYear(), m.getMonth(), day);
      const amounts = [350, 500, 750, 1000, 1200, 1500, 2000, 2500, 3000];
      const descs: Record<string, string[]> = {
        utilities: ['Electricity bill', 'Water bill', 'Gas bill', 'Internet service'],
        supplies: ['Cleaning supplies', 'Office supplies', 'Guest amenities', 'Linens'],
        maintenance: ['Plumbing repair', 'AC service', 'Elevator maintenance', 'Painting'],
        salary: ['Staff salaries', 'Kitchen staff wages', 'Bonus payout'],
        marketing: ['Online ads', 'Social media campaign', 'Print materials', 'Website maintenance'],
        food: ['Kitchen supplies', 'Restaurant provisions', 'Bar stock'],
        transport: ['Shuttle service', 'Guest transport', 'Parking maintenance'],
        other: ['Insurance', 'Licenses', 'Miscellaneous'],
      };
      const cat = expenseCats[Math.floor(Math.random() * expenseCats.length)];
      const desc = descs[cat][Math.floor(Math.random() * descs[cat].length)];
      const amount = amounts[Math.floor(Math.random() * amounts.length)];
      await db.execute(
        'INSERT INTO expenses (id, hotel_id, category, description, amount, date) VALUES (?, ?, ?, ?, ?, ?)',
        [uuid(), hotelId, cat, desc, amount, fmt(expDate)]
      );
      histExpenses++;
    }
  }

  console.log('Seed data inserted successfully!');
  console.log(`- 1 hotel (Grand Hotel Ease)`);
  // ─────────────────────────────────────────────────────────────
  // Sample Integrations
  // ─────────────────────────────────────────────────────────────
  const sampleIntegrations = [
    { type: 'channel_manager', provider: 'bookingdotcom', name: 'Booking.com', enabled: true },
    { type: 'payment_gateway', provider: 'paystack', name: 'Paystack', enabled: true },
    { type: 'accounting', provider: 'quickbooks', name: 'QuickBooks', enabled: false },
  ];
  for (const si of sampleIntegrations) {
    await db.execute(
      'INSERT INTO integrations (id, hotel_id, type, provider, name, enabled) VALUES (?, ?, ?, ?, ?, ?)',
      [uuid(), hotelId, si.type, si.provider, si.name, si.enabled]
    );
  }

  // ── Enterprise Seed Data ──
  const corpId = uuid();
  await db.execute(
    'INSERT INTO corporate_accounts (id, hotel_id, company_name, contact_name, contact_email, contact_phone, credit_limit, payment_terms, discount_rate, notes) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [corpId, hotelId, 'Accra Business Corp', 'John Doe', 'john@abusiness.com', '+233501234567', 50000, 'net30', 5, 'Preferred corporate client']
  );
  if (roomTypes.length) {
    await db.execute(
      'INSERT INTO corporate_rates (id, account_id, room_type_id, negotiated_price, valid_from) VALUES (?,?,?,?,?)',
      [uuid(), corpId, roomTypes[0].id, roomTypes[0].base_price * 0.8, fmt(today)]
    );
  }
  const groupId = uuid();
  await db.execute(
    'INSERT INTO franchise_groups (id, name, parent_hotel_id, settings) VALUES (?,?,?,?)',
    [groupId, 'Grand Hotel Ease Group', hotelId, '{"currency":"GHS","timezone":"Africa/Accra"}']
  );
  await db.execute(
    'INSERT INTO franchise_members (id, group_id, hotel_id, role) VALUES (?,?,?,?)',
    [uuid(), groupId, hotelId, 'owner']
  );
  await db.execute(
    'INSERT INTO custom_roles (id, hotel_id, name, permissions) VALUES (?,?,?,?)',
    [uuid(), hotelId, 'Night Auditor', JSON.stringify(['bookings.view','bookings.edit','guests.view','billing.view','reports.view','inventory.view'])]
  );
  await db.execute(
    'INSERT INTO custom_roles (id, hotel_id, name, permissions) VALUES (?,?,?,?)',
    [uuid(), hotelId, 'Revenue Manager', JSON.stringify(['bookings.view','bookings.edit','rooms.edit','reports.view','reports.export','ai.view','inventory.view'])]
  );
  const apiKeyRaw = 'he_' + Array.from({length:48},()=>'abcdef0123456789'[Math.floor(Math.random()*16)]).join('');
  const apiSecretRaw = Array.from({length:64},()=>'abcdef0123456789'[Math.floor(Math.random()*16)]).join('');
  await db.execute(
    'INSERT INTO api_keys (id, hotel_id, name, key, secret, permissions, ip_whitelist, rate_limit) VALUES (?,?,?,?,?,?,?,?)',
    [uuid(), hotelId, 'Production App', apiKeyRaw, apiSecretRaw, '["read","write"]', '["192.168.1.0/24"]', 500]
  );
  await db.execute(
    'INSERT INTO white_label_settings (id, hotel_id, primary_color, footer_text) VALUES (?,?,?,?)',
    [uuid(), hotelId, '#3b82f6', 'Powered by HotelEase']
  );

  // ─────────────────────────────────────────────────────────────
  // Phase 7: Inventory items
  // ─────────────────────────────────────────────────────────────
  const inventoryItems = [
    { name: 'Shampoo (Small)', cat: 'toiletries', qty: 120, unit: 'piece', min: 30, cost: 3.50, notes: '50ml hotel-size bottles' },
    { name: 'Conditioner (Small)', cat: 'toiletries', qty: 80, unit: 'piece', min: 30, cost: 3.50, notes: '50ml hotel-size bottles' },
    { name: 'Body Lotion (Small)', cat: 'toiletries', qty: 60, unit: 'piece', min: 20, cost: 4.00, notes: '30ml hotel-size bottles' },
    { name: 'Soap (Bar)', cat: 'toiletries', qty: 200, unit: 'piece', min: 50, cost: 1.50, notes: 'Standard hotel soap bars' },
    { name: 'Shower Cap', cat: 'toiletries', qty: 150, unit: 'piece', min: 40, cost: 0.50, notes: 'Individually wrapped' },
    { name: 'Toilet Paper Roll', cat: 'toiletries', qty: 300, unit: 'roll', min: 50, cost: 1.20, notes: '2-ply premium' },
    { name: 'Tissue Box', cat: 'toiletries', qty: 100, unit: 'box', min: 20, cost: 2.00, notes: '200 sheet boxes' },
    { name: 'King Sheet Set', cat: 'linens', qty: 40, unit: 'set', min: 15, cost: 45.00, notes: '500 thread count cotton' },
    { name: 'Queen Sheet Set', cat: 'linens', qty: 50, unit: 'set', min: 20, cost: 38.00, notes: '500 thread count cotton' },
    { name: 'Twin Sheet Set', cat: 'linens', qty: 30, unit: 'set', min: 10, cost: 30.00, notes: '500 thread count cotton' },
    { name: 'Bath Towel', cat: 'linens', qty: 150, unit: 'piece', min: 40, cost: 15.00, notes: 'Premium white cotton' },
    { name: 'Hand Towel', cat: 'linens', qty: 120, unit: 'piece', min: 30, cost: 8.00, notes: 'Premium white cotton' },
    { name: 'Face Cloth', cat: 'linens', qty: 180, unit: 'piece', min: 50, cost: 4.00, notes: 'Premium white cotton' },
    { name: 'Bath Mat', cat: 'linens', qty: 50, unit: 'piece', min: 15, cost: 12.00, notes: 'Non-slip backing' },
    { name: 'Pillow', cat: 'linens', qty: 60, unit: 'piece', min: 20, cost: 25.00, notes: 'Hypoallergenic down alternative' },
    { name: 'Cola (Can)', cat: 'minibar', qty: 96, unit: 'can', min: 24, cost: 0.80, notes: '12oz cans' },
    { name: 'Water (Still)', cat: 'minibar', qty: 120, unit: 'bottle', min: 24, cost: 0.60, notes: '500ml' },
    { name: 'Water (Sparkling)', cat: 'minibar', qty: 48, unit: 'bottle', min: 12, cost: 1.00, notes: '500ml' },
    { name: 'Orange Juice', cat: 'minibar', qty: 36, unit: 'bottle', min: 12, cost: 1.50, notes: '250ml' },
    { name: 'Beer', cat: 'minibar', qty: 24, unit: 'bottle', min: 12, cost: 2.00, notes: 'Local brand 330ml' },
    { name: 'Wine (Mini)', cat: 'minibar', qty: 12, unit: 'bottle', min: 6, cost: 8.00, notes: '187ml red/white' },
    { name: 'Chips (Assorted)', cat: 'minibar', qty: 48, unit: 'bag', min: 12, cost: 1.20, notes: '50g snack bags' },
    { name: 'Chocolate Bar', cat: 'minibar', qty: 36, unit: 'piece', min: 12, cost: 2.50, notes: 'Premium imported' },
    { name: 'All-Purpose Cleaner', cat: 'cleaning', qty: 20, unit: 'bottle', min: 5, cost: 5.00, notes: '1L spray bottles' },
    { name: 'Glass Cleaner', cat: 'cleaning', qty: 15, unit: 'bottle', min: 5, cost: 4.50, notes: '750ml spray bottles' },
    { name: 'Disinfectant Wipes', cat: 'cleaning', qty: 30, unit: 'canister', min: 10, cost: 6.00, notes: '80-count canisters' },
    { name: 'Trash Bags (Large)', cat: 'cleaning', qty: 200, unit: 'piece', min: 50, cost: 0.25, notes: '50 gal heavy duty' },
    { name: 'Mop Head (Replace)', cat: 'cleaning', qty: 8, unit: 'piece', min: 4, cost: 8.00, notes: 'Microfiber replacement heads' },
    { name: 'Vacuum Bag', cat: 'cleaning', qty: 10, unit: 'piece', min: 4, cost: 5.00, notes: 'Universal fit' },
    { name: 'Light Bulb (LED)', cat: 'maintenance', qty: 25, unit: 'piece', min: 10, cost: 6.00, notes: 'A19 9W 800lm warm white' },
    { name: 'Battery (AA)', cat: 'maintenance', qty: 48, unit: 'piece', min: 12, cost: 1.00, notes: 'Alkaline 12-pack' },
    { name: 'Battery (AAA)', cat: 'maintenance', qty: 36, unit: 'piece', min: 12, cost: 1.00, notes: 'Alkaline 12-pack' },
    { name: 'Fuse (Standard)', cat: 'maintenance', qty: 12, unit: 'piece', min: 6, cost: 0.75, notes: 'Assorted 5A-15A' },
    { name: 'Printer Paper', cat: 'office', qty: 20, unit: 'ream', min: 5, cost: 6.00, notes: '500 sheet reams A4' },
    { name: 'Ballpoint Pens', cat: 'office', qty: 50, unit: 'piece', min: 10, cost: 0.50, notes: 'Blue ink' },
    { name: 'Key Cards (Blank)', cat: 'other', qty: 100, unit: 'piece', min: 20, cost: 1.50, notes: 'Magnetic stripe door cards' },
  ];
  for (const item of inventoryItems) {
    await db.execute(
      'INSERT INTO inventory_items (id, hotel_id, name, category, quantity, unit, min_stock, cost_price, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid(), hotelId, item.name, item.cat, item.qty, item.unit, item.min, item.cost, item.notes]
    );
  }

  console.log(`- 2 users (admin/admin123, owner/owner123)`);
  console.log(`- ${roomTypes.length} room types`);
  console.log(`- ${rooms.length} rooms`);
  console.log(`- 5 guests`);
  console.log(`- ${services.length} services`);
  console.log(`- ${sampleBookings.length} initial bookings + ${histBookings} historical bookings`);
  console.log(`- ${departments.length} departments`);
  console.log(`- ${employees.length} employees`);
  console.log(`- ${hkTasks.length} housekeeping tasks`);
  console.log(`- ${maintRequests.length} maintenance requests`);
  console.log(`- ${rsRequests.length} room service requests`);
  console.log(`- 2 sample deposits`);
  console.log(`- ${histExpenses} historical expenses (12 months)`);
  console.log(`- ${inventoryItems.length} inventory items`);
  console.log(`- ${sampleIntegrations.length} integrations`);
  console.log('- 1 corporate account, 1 franchise group, 2 custom roles, 1 API key, 1 white-label config');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
