import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './test-app.js';
import { seedTestData } from './setup.js';

const app = createApp();
let token: string;

beforeEach(async () => {
  await seedTestData();
  const login = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  token = login.body.token;
});

describe('GET /api/reports/summary', () => {
  it('should return the full report summary', async () => {
    const res = await request(app)
      .get('/api/reports/summary')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('dailySales');
    expect(res.body).toHaveProperty('monthlySales');
    expect(res.body).toHaveProperty('totalRevenue');
    expect(res.body).toHaveProperty('occupancy');
    expect(res.body.occupancy).toHaveProperty('currentRate');
    expect(res.body).toHaveProperty('adr');
    expect(res.body).toHaveProperty('revpar');
    expect(res.body).toHaveProperty('guestDemographics');
  });
});
