import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './test-app.js';
import { seedTestData } from './setup.js';

const app = createApp();
let token: string;

beforeEach(async () => {
  seedTestData();
  const login = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  token = login.body.token;
});

describe('GET /api/dashboard', () => {
  it('should return dashboard stats', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalRooms');
    expect(res.body).toHaveProperty('availableRooms');
    expect(res.body).toHaveProperty('occupiedRooms');
    expect(res.body).toHaveProperty('maintenanceRooms');
    expect(res.body).toHaveProperty('occupancyRate');
    expect(res.body).toHaveProperty('checkInsToday');
    expect(res.body).toHaveProperty('checkOutsToday');
    expect(res.body).toHaveProperty('activeBookings');
    expect(res.body).toHaveProperty('totalRevenue');
    expect(res.body).toHaveProperty('pendingPayments');
    expect(res.body).toHaveProperty('recentBookings');
    expect(res.body.totalRooms).toBe(2);
    expect(res.body.availableRooms).toBe(2);
  });
});
