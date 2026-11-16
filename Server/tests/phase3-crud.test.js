import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../src/app.js';
import { pool } from '../src/db/index.js';

describe('Phase 3 Core CRUD, Soft Delete & Validation Verification', () => {
  jest.setTimeout(30000);

  let sessionCookie = '';
  let memberShivannaId = '';
  let memberUdayId = '';
  let oatsProductId = '';
  let otherProductId = '';
  let categoryDairyId = '';

  beforeAll(async () => {
    // 1. Log in to get session cookie
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'shivanna@nutrientsocean.com', password: 'Admin@123' });

    expect(loginRes.status).toBe(200);
    sessionCookie = loginRes.headers['set-cookie'].find((c) => c.startsWith('session=')).split(';')[0];

    // 2. Query seeded members, products, categories
    const members = await pool.query('SELECT id, name FROM members ORDER BY name;');
    memberShivannaId = members.rows.find((m) => m.name === 'Shivanna Gorkal').id;
    memberUdayId = members.rows.find((m) => m.name === 'Uday K S').id;

    const products = await pool.query('SELECT id, name FROM products;');
    oatsProductId = products.rows.find((p) => p.name === 'Nightout Oats').id;
    otherProductId = products.rows.find((p) => p.name === 'Other').id;

    const categories = await pool.query('SELECT id, name FROM expense_categories;');
    categoryDairyId = categories.rows.find((c) => c.name === 'Milk & Dairy Products').id;
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('1. GET /api/meta', () => {
    test('Returns members, products, categories, and enums', async () => {
      const res = await request(app)
        .get('/api/meta')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.members.length).toBeGreaterThanOrEqual(3);
      expect(res.body.products.length).toBeGreaterThanOrEqual(5);
      expect(res.body.categories.length).toBeGreaterThanOrEqual(6);
      expect(res.body.enums).toEqual({
        payment_methods: ['UPI', 'Cash'],
        expense_payment_methods: ['UPI', 'Cash', 'Personal Payment'],
        expense_types: ['Regular Business Expense', 'Initial Investment'],
      });
    });

    test('Requires authentication', async () => {
      const res = await request(app).get('/api/meta');
      expect(res.status).toBe(401);
    });
  });

  describe('2. Sales CRUD & Soft Delete', () => {
    let createdSaleId = '';

    test('POST /api/sales/records creates a sale where total_amount is independent source of truth', async () => {
      // 1 item of Nightout Oats (79), but customer paid 80
      const res = await request(app)
        .post('/api/sales/records')
        .set('Cookie', sessionCookie)
        .send({
          sale_date: '2026-11-14',
          product_id: oatsProductId,
          quantity: 1,
          price_per_item: 79.0,
          total_amount: 80.0,
          payment_method: 'UPI',
          received_by: memberShivannaId,
          notes: 'Customer tipped ₹1',
        });

      expect(res.status).toBe(201);
      expect(res.body.record).toBeDefined();
      expect(res.body.record.total_amount).toBe(80.0);
      expect(res.body.record.is_mixed).toBe(false);
      expect(res.body.record.source).toBe('app');
      createdSaleId = res.body.record.id;
    });

    test('POST /api/sales/records with "Other" product requires notes (min 3 chars)', async () => {
      // Missing or short notes with "Other" must fail with 400
      const res = await request(app)
        .post('/api/sales/records')
        .set('Cookie', sessionCookie)
        .send({
          sale_date: '2026-11-14',
          product_id: otherProductId,
          quantity: 2,
          total_amount: 150.0,
          payment_method: 'Cash',
          received_by: memberShivannaId,
          notes: 'No', // < 3 chars
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');

      // Valid notes with "Other" succeeds and sets is_mixed = true
      const successRes = await request(app)
        .post('/api/sales/records')
        .set('Cookie', sessionCookie)
        .send({
          sale_date: '2026-11-14',
          product_id: otherProductId,
          quantity: 2,
          total_amount: 150.0,
          payment_method: 'Cash',
          received_by: memberShivannaId,
          notes: 'Mixed combo order: 1 sandwich + 1 oats',
        });

      expect(successRes.status).toBe(201);
      expect(successRes.body.record.is_mixed).toBe(true);
    });

    test('GET /api/sales/records returns paginated list with joined names', async () => {
      const res = await request(app)
        .get('/api/sales/records?from=2026-11-01&to=2026-11-30')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.records).toBeDefined();
      expect(res.body.records.length).toBeGreaterThanOrEqual(1);
      expect(res.body.records[0].product_name).toBeDefined();
      expect(res.body.records[0].received_by_name).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });

    test('GET /api/sales/records/:id returns single sale', async () => {
      const res = await request(app)
        .get(`/api/sales/records/${createdSaleId}`)
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.record.id).toBe(createdSaleId);
      expect(res.body.record.total_amount).toBe(80.0);
    });

    test('PUT /api/sales/records/:id updates a sale', async () => {
      const res = await request(app)
        .put(`/api/sales/records/${createdSaleId}`)
        .set('Cookie', sessionCookie)
        .send({
          total_amount: 85.0,
          notes: 'Updated total amount to 85',
        });

      expect(res.status).toBe(200);
      expect(res.body.record.total_amount).toBe(85.0);
      expect(res.body.record.notes).toBe('Updated total amount to 85');
    });

    test('DELETE /api/sales/records/:id soft deletes the sale', async () => {
      const res = await request(app)
        .delete(`/api/sales/records/${createdSaleId}`)
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      // Verify soft delete in DB
      const dbCheck = await pool.query('SELECT deleted_at FROM sales WHERE id = $1;', [createdSaleId]);
      expect(dbCheck.rows[0].deleted_at).not.toBeNull();

      // Verify GET returns 404
      const getRes = await request(app)
        .get(`/api/sales/records/${createdSaleId}`)
        .set('Cookie', sessionCookie);
      expect(getRes.status).toBe(404);
    });
  });

  describe('3. Expenses CRUD & Soft Delete', () => {
    let createdExpenseId = '';

    test('POST /api/expenses/records creates regular business expense', async () => {
      const res = await request(app)
        .post('/api/expenses/records')
        .set('Cookie', sessionCookie)
        .send({
          expense_date: '2026-11-14',
          category_id: categoryDairyId,
          description: 'Amul Taza Milk 5 packets',
          amount: 140.0,
          payment_method: 'UPI',
          paid_by: memberShivannaId,
          expense_type: 'Regular Business Expense',
          notes: 'Daily milk purchase',
        });

      expect(res.status).toBe(201);
      expect(res.body.record.amount).toBe(140.0);
      expect(res.body.record.expense_type).toBe('Regular Business Expense');
      createdExpenseId = res.body.record.id;
    });

    test('POST /api/expenses/records creates initial investment', async () => {
      const res = await request(app)
        .post('/api/expenses/records')
        .set('Cookie', sessionCookie)
        .send({
          expense_date: '2026-11-01',
          category_id: categoryDairyId,
          description: 'Initial seed capital contribution',
          amount: 2000.0,
          payment_method: 'Personal Payment',
          paid_by: memberUdayId,
          expense_type: 'Initial Investment',
        });

      expect(res.status).toBe(201);
      expect(res.body.record.expense_type).toBe('Initial Investment');
      expect(res.body.record.amount).toBe(2000.0);
    });

    test('GET /api/expenses/records returns paginated list with joined names', async () => {
      const res = await request(app)
        .get('/api/expenses/records?from=2026-11-01&to=2026-11-30')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.records.length).toBeGreaterThanOrEqual(1);
      expect(res.body.records[0].category_name).toBeDefined();
      expect(res.body.records[0].paid_by_name).toBeDefined();
    });

    test('DELETE /api/expenses/records/:id soft deletes expense', async () => {
      const res = await request(app)
        .delete(`/api/expenses/records/${createdExpenseId}`)
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const dbCheck = await pool.query('SELECT deleted_at FROM expenses WHERE id = $1;', [createdExpenseId]);
      expect(dbCheck.rows[0].deleted_at).not.toBeNull();
    });
  });

  describe('4. Settlements CRUD & Soft Delete', () => {
    let createdSettlementId = '';

    test('POST /api/settlements rejects settlement where paid_by == paid_to', async () => {
      const res = await request(app)
        .post('/api/settlements')
        .set('Cookie', sessionCookie)
        .send({
          settlement_date: '2026-11-14',
          amount: 500.0,
          paid_by: memberShivannaId,
          paid_to: memberShivannaId, // Same member!
          notes: 'Self reimbursement attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('POST /api/settlements creates settlement between different partners', async () => {
      const res = await request(app)
        .post('/api/settlements')
        .set('Cookie', sessionCookie)
        .send({
          settlement_date: '2026-11-14',
          amount: 500.0,
          paid_by: memberShivannaId,
          paid_to: memberUdayId,
          notes: 'Reimbursement for milk and ingredients',
        });

      expect(res.status).toBe(201);
      expect(res.body.record.amount).toBe(500.0);
      createdSettlementId = res.body.record.id;
    });

    test('GET /api/settlements lists all settlements with joined names', async () => {
      const res = await request(app)
        .get('/api/settlements')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.records.length).toBeGreaterThanOrEqual(1);
      expect(res.body.records[0].paid_by_name).toBe('Shivanna Gorkal');
      expect(res.body.records[0].paid_to_name).toBe('Uday K S');
    });

    test('DELETE /api/settlements/:id soft deletes settlement', async () => {
      const res = await request(app)
        .delete(`/api/settlements/${createdSettlementId}`)
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const dbCheck = await pool.query('SELECT deleted_at FROM settlements WHERE id = $1;', [createdSettlementId]);
      expect(dbCheck.rows[0].deleted_at).not.toBeNull();
    });
  });
});
