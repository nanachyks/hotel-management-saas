import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getDb } from '../db.js';
import { createApp } from './test-app.js';
import { seedTestData } from './setup.js';

const app = createApp();
let token: string;
let hotelId: string;

beforeEach(async () => {
  const ids = seedTestData();
  hotelId = ids.hotelId;
  const login = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  token = login.body.token;
});

describe('Corporate Accounts', () => {
  it('GET /api/corporate - should list corporate accounts', async () => {
    const res = await request(app)
      .get('/api/corporate')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/corporate - should create a corporate account', async () => {
    const res = await request(app)
      .post('/api/corporate')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'Acme Corp', payment_terms: 'net30' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
  });

  it('POST /api/corporate - should create with defaults', async () => {
    const res = await request(app)
      .post('/api/corporate')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'Test Corp' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
  });

  it('PUT /api/corporate/:id - should update a corporate account', async () => {
    const create = await request(app)
      .post('/api/corporate')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'Acme Corp' });
    const id = create.body.id;
    const res = await request(app)
      .put(`/api/corporate/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'Acme Updated', payment_terms: 'net60', status: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /api/corporate/:id - should delete a corporate account', async () => {
    const create = await request(app)
      .post('/api/corporate')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'Acme Corp' });
    const id = create.body.id;
    const res = await request(app)
      .delete(`/api/corporate/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/corporate/:id/rates - should list corporate rates', async () => {
    const create = await request(app)
      .post('/api/corporate')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'Acme Corp' });
    const id = create.body.id;
    const res = await request(app)
      .get(`/api/corporate/${id}/rates`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/corporate/:id/rates - should create a corporate rate', async () => {
    const db = getDb();
    const types = db.queryAll('SELECT id FROM room_types');
    const create = await request(app)
      .post('/api/corporate')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'Acme Corp' });
    const id = create.body.id;
    const res = await request(app)
      .post(`/api/corporate/${id}/rates`)
      .set('Authorization', `Bearer ${token}`)
      .send({ room_type_id: types[0].id, negotiated_price: 250 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
  });

  it('DELETE /api/corporate/rates/:rateId - should delete a corporate rate', async () => {
    const db = getDb();
    const types = db.queryAll('SELECT id FROM room_types');
    const create = await request(app)
      .post('/api/corporate')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'Acme Corp' });
    const id = create.body.id;
    const rateCreate = await request(app)
      .post(`/api/corporate/${id}/rates`)
      .set('Authorization', `Bearer ${token}`)
      .send({ room_type_id: types[0].id, negotiated_price: 250 });
    const res = await request(app)
      .delete(`/api/corporate/rates/${rateCreate.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
