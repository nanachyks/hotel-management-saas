import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './test-app.js';
import { seedTestData } from './setup.js';

const app = createApp();
let token: string;

beforeEach(async () => {
  const ids = await seedTestData();
  const login = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  token = login.body.token;
});

describe('White-Label Settings', () => {
  it('GET /api/white-label - should return default settings', async () => {
    const res = await request(app)
      .get('/api/white-label')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('primary_color');
  });

  it('PUT /api/white-label - should update settings', async () => {
    const res = await request(app)
      .put('/api/white-label')
      .set('Authorization', `Bearer ${token}`)
      .send({ primary_color: '#ff0000', custom_domain: 'myhotel.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PUT /api/white-label - should update existing settings', async () => {
    await request(app)
      .put('/api/white-label')
      .set('Authorization', `Bearer ${token}`)
      .send({ primary_color: '#ff0000' });
    const res = await request(app)
      .put('/api/white-label')
      .set('Authorization', `Bearer ${token}`)
      .send({ primary_color: '#00ff00', logo_url: 'https://example.com/logo.png' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/white-label - should return updated settings after update', async () => {
    await request(app)
      .put('/api/white-label')
      .set('Authorization', `Bearer ${token}`)
      .send({ primary_color: '#ff0000', footer_text: 'My Hotel' });
    const res = await request(app)
      .get('/api/white-label')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.primary_color).toBe('#ff0000');
    expect(res.body.footer_text).toBe('My Hotel');
  });
});
