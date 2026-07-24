import 'dotenv/config';
import { beforeAll, afterEach } from 'vitest';
import { initTestDb, resetDb, getDb } from '../db.js';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';

let seeded = false;

beforeAll(async () => {
  if (!seeded) {
    await initTestDb();
    seeded = true;
  }
});

afterEach(() => {
  const db = getDb();
  db.execute('DELETE FROM booking_services');
  db.execute('DELETE FROM services');
  db.execute('DELETE FROM invoices');
  db.execute('DELETE FROM bookings');
  db.execute('DELETE FROM guests');
  db.execute('DELETE FROM rooms');
  db.execute('DELETE FROM room_types');
  db.execute('DELETE FROM users');
  db.execute('DELETE FROM hotels');
  db.execute('DELETE FROM login_attempts');
  db.execute('DELETE FROM refresh_tokens');
  db.execute('DELETE FROM password_resets');
  db.execute('DELETE FROM email_verifications');
  db.execute('DELETE FROM hotel_invitations');
});

export function seedTestData() {
  const db = getDb();

  const hotelId = uuid();
  db.execute(
    `INSERT INTO hotels (id, name, slug, email, phone, currency, tax_rate, timezone, check_in_time, check_out_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [hotelId, 'Test Hotel', 'test-hotel', 'hotel@test.com', '+1-555-0000', 'USD', 10, 'UTC', '14:00', '11:00']
  );

  const adminId = uuid();
  const staffId = uuid();
  const ownerId = uuid();
  db.execute(
    'INSERT INTO users (id, hotel_id, username, email, password_hash, name, role, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
    [adminId, hotelId, 'admin', 'admin@test.com', bcrypt.hashSync('admin123', 10), 'Admin User', 'admin']
  );
  db.execute(
    'INSERT INTO users (id, hotel_id, username, email, password_hash, name, role, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
    [staffId, hotelId, 'receptionist', 'receptionist@test.com', bcrypt.hashSync('receptionist123', 10), 'Receptionist User', 'receptionist']
  );
  db.execute(
    'INSERT INTO users (id, hotel_id, username, email, password_hash, name, role, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
    [ownerId, hotelId, 'owner', 'owner@test.com', bcrypt.hashSync('owner123', 10), 'Owner User', 'owner']
  );

  const rt1Id = uuid();
  const rt2Id = uuid();
  db.execute(
    'INSERT INTO room_types (id, hotel_id, name, description, base_price, capacity) VALUES (?, ?, ?, ?, ?, ?)',
    [rt1Id, hotelId, 'Standard Single', 'Basic room', 300, 1]
  );
  db.execute(
    'INSERT INTO room_types (id, hotel_id, name, description, base_price, capacity) VALUES (?, ?, ?, ?, ?, ?)',
    [rt2Id, hotelId, 'Deluxe', 'Premium room', 650, 2]
  );

  const room1Id = uuid();
  const room2Id = uuid();
  db.execute(
    'INSERT INTO rooms (id, hotel_id, room_number, room_type_id, floor, status) VALUES (?, ?, ?, ?, ?, ?)',
    [room1Id, hotelId, '101', rt1Id, 1, 'available']
  );
  db.execute(
    'INSERT INTO rooms (id, hotel_id, room_number, room_type_id, floor, status) VALUES (?, ?, ?, ?, ?, ?)',
    [room2Id, hotelId, '102', rt2Id, 1, 'available']
  );

  const guestId = uuid();
  db.execute(
    'INSERT INTO guests (id, hotel_id, first_name, last_name, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
    [guestId, hotelId, 'John', 'Doe', 'john@test.com', '+1-555-0101']
  );

  const svc1Id = uuid();
  const svc2Id = uuid();
  db.execute(
    'INSERT INTO services (id, hotel_id, name, description, price, category) VALUES (?, ?, ?, ?, ?, ?)',
    [svc1Id, hotelId, 'Breakfast', 'Morning meal', 50, 'food']
  );
  db.execute(
    'INSERT INTO services (id, hotel_id, name, description, price, category) VALUES (?, ?, ?, ?, ?, ?)',
    [svc2Id, hotelId, 'Spa', 'Relaxation', 200, 'spa']
  );

  return { adminId, staffId, ownerId, hotelId, rt1Id, rt2Id, room1Id, room2Id, guestId, svc1Id, svc2Id };
}
