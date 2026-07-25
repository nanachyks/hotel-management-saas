import 'dotenv/config';
import { beforeAll, afterEach } from 'vitest';
import { initTestDb, getDb } from '../db.js';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';

let seeded = false;

beforeAll(async () => {
  if (!seeded) {
    await initTestDb();
    seeded = true;
  }
});

afterEach(async () => {
  const db = getDb();
  // Truncate every app table (all 48+ tables, with FKs now enforced by
  // Postgres — unlike sql.js, which never enforced them). CASCADE handles
  // dependency order automatically instead of us maintaining a manual,
  // ever-growing per-table DELETE list.
  const tables = (await db.queryAll(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'schema_migrations'`
  )).map((r: any) => `"${r.tablename}"`);
  if (tables.length > 0) {
    await db.execute(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`);
  }
});

export async function seedTestData() {
  const db = getDb();

  const hotelId = uuid();
  await db.execute(
    `INSERT INTO hotels (id, name, slug, email, phone, currency, tax_rate, timezone, check_in_time, check_out_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [hotelId, 'Test Hotel', 'test-hotel', 'hotel@test.com', '+1-555-0000', 'USD', 10, 'UTC', '14:00', '11:00']
  );

  const adminId = uuid();
  const staffId = uuid();
  const ownerId = uuid();
  await db.execute(
    'INSERT INTO users (id, hotel_id, username, email, password_hash, name, role, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, true)',
    [adminId, hotelId, 'admin', 'admin@test.com', bcrypt.hashSync('admin123', 10), 'Admin User', 'admin']
  );
  await db.execute(
    'INSERT INTO users (id, hotel_id, username, email, password_hash, name, role, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, true)',
    [staffId, hotelId, 'receptionist', 'receptionist@test.com', bcrypt.hashSync('receptionist123', 10), 'Receptionist User', 'receptionist']
  );
  await db.execute(
    'INSERT INTO users (id, hotel_id, username, email, password_hash, name, role, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, true)',
    [ownerId, hotelId, 'owner', 'owner@test.com', bcrypt.hashSync('owner123', 10), 'Owner User', 'owner']
  );

  const rt1Id = uuid();
  const rt2Id = uuid();
  await db.execute(
    'INSERT INTO room_types (id, hotel_id, name, description, base_price, capacity) VALUES (?, ?, ?, ?, ?, ?)',
    [rt1Id, hotelId, 'Standard Single', 'Basic room', 300, 1]
  );
  await db.execute(
    'INSERT INTO room_types (id, hotel_id, name, description, base_price, capacity) VALUES (?, ?, ?, ?, ?, ?)',
    [rt2Id, hotelId, 'Deluxe', 'Premium room', 650, 2]
  );

  const room1Id = uuid();
  const room2Id = uuid();
  await db.execute(
    'INSERT INTO rooms (id, hotel_id, room_number, room_type_id, floor, status) VALUES (?, ?, ?, ?, ?, ?)',
    [room1Id, hotelId, '101', rt1Id, 1, 'available']
  );
  await db.execute(
    'INSERT INTO rooms (id, hotel_id, room_number, room_type_id, floor, status) VALUES (?, ?, ?, ?, ?, ?)',
    [room2Id, hotelId, '102', rt2Id, 1, 'available']
  );

  const guestId = uuid();
  await db.execute(
    'INSERT INTO guests (id, hotel_id, first_name, last_name, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
    [guestId, hotelId, 'John', 'Doe', 'john@test.com', '+1-555-0101']
  );

  const svc1Id = uuid();
  const svc2Id = uuid();
  await db.execute(
    'INSERT INTO services (id, hotel_id, name, description, price, category) VALUES (?, ?, ?, ?, ?, ?)',
    [svc1Id, hotelId, 'Breakfast', 'Morning meal', 50, 'food']
  );
  await db.execute(
    'INSERT INTO services (id, hotel_id, name, description, price, category) VALUES (?, ?, ?, ?, ?, ?)',
    [svc2Id, hotelId, 'Spa', 'Relaxation', 200, 'spa']
  );

  return { adminId, staffId, ownerId, hotelId, rt1Id, rt2Id, room1Id, room2Id, guestId, svc1Id, svc2Id };
}
