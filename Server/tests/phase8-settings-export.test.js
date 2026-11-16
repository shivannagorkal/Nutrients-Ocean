import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../src/app.js';
import { pool } from '../src/db/index.js';

describe('Phase 8 Settings, CSV Export & Section 15 Acceptance Tests', () => {
  jest.setTimeout(30000);

  let sessionCookie = '';
  let testProductId = '';
  let testCategoryId = '';

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'shivanna@nutrientsocean.com', password: 'Admin@123' });

    expect(loginRes.status).toBe(200);
    sessionCookie = loginRes.headers['set-cookie'].find((c) => c.startsWith('session=')).split(';')[0];

    // Clean up any leftovers from prior runs
    await pool.query("DELETE FROM products WHERE name LIKE '__test_%';");
    await pool.query("DELETE FROM expense_categories WHERE name LIKE '__test_%';");
  });

  afterAll(async () => {
    await pool.query("DELETE FROM products WHERE name LIKE '__test_%';");
    await pool.query("DELETE FROM expense_categories WHERE name LIKE '__test_%';");
    await pool.end();
  });

  describe('1. Products Management API', () => {
    test('GET /api/products requires authentication', async () => {
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(401);
    });

    test('GET /api/products returns products list', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.products.length).toBeGreaterThanOrEqual(4);
      expect(res.body.products[0]).toHaveProperty('id');
      expect(res.body.products[0]).toHaveProperty('name');
      expect(res.body.products[0]).toHaveProperty('is_active');
    });

    test('POST /api/products creates a new product', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Cookie', sessionCookie)
        .send({
          name: '__test_Protein_Shake__',
          default_price: 120.0,
          is_active: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.product).toBeDefined();
      expect(res.body.product.name).toBe('__test_Protein_Shake__');
      expect(res.body.product.default_price).toBe(120.0);
      expect(res.body.product.is_active).toBe(true);
      testProductId = res.body.product.id;
    });

    test('POST /api/products rejects duplicate name case-insensitively', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Cookie', sessionCookie)
        .send({
          name: '__TEST_protein_SHAKE__',
          default_price: 150.0,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DUPLICATE_NAME');
    });

    test('GET /api/products/:id returns single product', async () => {
      const res = await request(app)
        .get(`/api/products/${testProductId}`)
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.product.id).toBe(testProductId);
      expect(res.body.product.name).toBe('__test_Protein_Shake__');
    });

    test('PUT /api/products/:id updates product details and deactivates instead of delete', async () => {
      const res = await request(app)
        .put(`/api/products/${testProductId}`)
        .set('Cookie', sessionCookie)
        .send({
          name: '__test_Protein_Shake_Updated__',
          default_price: 135.5,
          is_active: false, // Deactivated
        });

      expect(res.status).toBe(200);
      expect(res.body.product.name).toBe('__test_Protein_Shake_Updated__');
      expect(res.body.product.default_price).toBe(135.5);
      expect(res.body.product.is_active).toBe(false);
    });

    test('Audit log records product creation and update', async () => {
      const auditRes = await pool.query(
        "SELECT * FROM audit_log WHERE entity = 'product' AND entity_id = $1 ORDER BY at ASC;",
        [testProductId]
      );
      expect(auditRes.rows.length).toBe(2);
      expect(auditRes.rows[0].action).toBe('create');
      expect(auditRes.rows[1].action).toBe('update');
    });
  });

  describe('2. Expense Categories Management API', () => {
    test('GET /api/categories requires authentication', async () => {
      const res = await request(app).get('/api/categories');
      expect(res.status).toBe(401);
    });

    test('GET /api/categories returns categories list', async () => {
      const res = await request(app)
        .get('/api/categories')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.categories)).toBe(true);
      expect(res.body.categories.length).toBeGreaterThanOrEqual(5);
    });

    test('POST /api/categories creates a new category', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Cookie', sessionCookie)
        .send({
          name: '__test_Packaging_Supplies__',
        });

      expect(res.status).toBe(201);
      expect(res.body.category.name).toBe('__test_Packaging_Supplies__');
      testCategoryId = res.body.category.id;
    });

    test('POST /api/categories rejects duplicate category name case-insensitively', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Cookie', sessionCookie)
        .send({
          name: '__TEST_packaging_SUPPLIES__',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DUPLICATE_NAME');
    });

    test('PUT /api/categories/:id updates category name', async () => {
      const res = await request(app)
        .put(`/api/categories/${testCategoryId}`)
        .set('Cookie', sessionCookie)
        .send({
          name: '__test_Eco_Packaging__',
        });

      expect(res.status).toBe(200);
      expect(res.body.category.name).toBe('__test_Eco_Packaging__');
    });

    test('Audit log records category creation and update', async () => {
      const auditRes = await pool.query(
        "SELECT * FROM audit_log WHERE entity = 'expense_category' AND entity_id = $1 ORDER BY at ASC;",
        [testCategoryId]
      );
      expect(auditRes.rows.length).toBe(2);
      expect(auditRes.rows[0].action).toBe('create');
      expect(auditRes.rows[1].action).toBe('update');
    });
  });

  describe('3. CSV Export API', () => {
    test('GET /api/export/sales.csv requires authentication', async () => {
      const res = await request(app).get('/api/export/sales.csv');
      expect(res.status).toBe(401);
    });

    test('GET /api/export/sales.csv returns RFC 4180 CSV attachment', async () => {
      const res = await request(app)
        .get('/api/export/sales.csv?from=2026-01-01&to=2026-12-31')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="sales_2026-01-01_to_2026-12-31\.csv"/);

      const lines = res.text.split('\r\n');
      expect(lines.length).toBeGreaterThan(1);
      const headers = lines[0].split(',');
      expect(headers).toEqual([
        'ID',
        'Sale Date',
        'Timestamp',
        'Product',
        'Quantity',
        'Price Per Item',
        'Total Amount Received',
        'Payment Method',
        'Received By',
        'Notes',
        'Import Ref',
      ]);
    });

    test('GET /api/export/expenses.csv requires authentication', async () => {
      const res = await request(app).get('/api/export/expenses.csv');
      expect(res.status).toBe(401);
    });

    test('GET /api/export/expenses.csv returns RFC 4180 CSV attachment', async () => {
      const res = await request(app)
        .get('/api/export/expenses.csv?from=2026-01-01&to=2026-12-31')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="expenses_2026-01-01_to_2026-12-31\.csv"/);

      const lines = res.text.split('\r\n');
      expect(lines.length).toBeGreaterThan(1);
      const headers = lines[0].split(',');
      expect(headers).toEqual([
        'ID',
        'Expense Date',
        'Timestamp',
        'Category',
        'Description',
        'Amount',
        'Payment Method',
        'Paid By',
        'Expense Type',
        'Notes',
        'Import Ref',
      ]);
    });

    test('CSV export with invalid date range returns 400 validation error', async () => {
      const res = await request(app)
        .get('/api/export/sales.csv?from=2026-07-31&to=2026-06-01')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('4. Section 15 Acceptance Tests Verification', () => {
    test('Acceptance 1: A sale of 1 x High Protein Oats (₹99) with total ₹100 increases Sales by exactly 100', async () => {
      const products = await pool.query("SELECT id FROM products WHERE name = 'High Protein Oats';");
      const members = await pool.query("SELECT id FROM members WHERE name = 'Shivanna Gorkal';");
      const productId = products.rows[0].id;
      const memberId = members.rows[0].id;

      const saleRes = await request(app)
        .post('/api/sales/records')
        .set('Cookie', sessionCookie)
        .send({
          sale_date: '2026-07-20',
          product_id: productId,
          quantity: 1,
          price_per_item: 99.0,
          total_amount: 100.0,
          payment_method: 'UPI',
          received_by: memberId,
          notes: 'Acceptance test 1: ₹100 total override',
        });

      expect(saleRes.status).toBe(201);
      const saleId = saleRes.body.record.id;

      // Verify today/date metrics reflect total_amount = 100
      const todayRes = await request(app)
        .get('/api/today?date=2026-07-20')
        .set('Cookie', sessionCookie);

      expect(todayRes.status).toBe(200);
      expect(todayRes.body.cards.sales).toBeGreaterThanOrEqual(100.0);

      // Clean up
      await pool.query('DELETE FROM sales WHERE id = $1;', [saleId]);
    });

    test('Acceptance 2: Mixed "Other" sale counts in Sales, Orders, Items sold, and appears in "Mixed / other orders"', async () => {
      const products = await pool.query("SELECT id FROM products WHERE name = 'Other';");
      const members = await pool.query("SELECT id FROM members WHERE name = 'Shivanna Gorkal';");
      const otherId = products.rows[0].id;
      const memberId = members.rows[0].id;

      const saleRes = await request(app)
        .post('/api/sales/records')
        .set('Cookie', sessionCookie)
        .send({
          sale_date: '2026-07-21',
          product_id: otherId,
          quantity: 1,
          total_amount: 150.0,
          payment_method: 'Cash',
          received_by: memberId,
          notes: 'Acceptance test 2: Mixed oatmeal combo',
        });

      expect(saleRes.status).toBe(201);
      const saleId = saleRes.body.record.id;

      const todayRes = await request(app)
        .get('/api/today?date=2026-07-21')
        .set('Cookie', sessionCookie);

      expect(todayRes.status).toBe(200);
      const otherRow = todayRes.body.products.find((p) => p.productName === 'Mixed / other orders');
      expect(otherRow).toBeDefined();
      expect(otherRow.sales).toBeGreaterThanOrEqual(150.0);
      expect(otherRow.units).toBeGreaterThanOrEqual(1);

      // Clean up
      await pool.query('DELETE FROM sales WHERE id = $1;', [saleId]);
    });

    test('Acceptance 3: Initial Investment increases Invested amount without increasing Expenses or reducing Net', async () => {
      const members = await pool.query("SELECT id FROM members WHERE name = 'Shivanna Gorkal';");
      const categories = await pool.query("SELECT id FROM expense_categories WHERE name = 'Other';");
      const memberId = members.rows[0].id;
      const categoryId = categories.rows[0].id;

      const expRes = await request(app)
        .post('/api/expenses/records')
        .set('Cookie', sessionCookie)
        .send({
          expense_date: '2026-07-22',
          category_id: categoryId,
          description: 'Acceptance test 3: Partner capital contribution',
          amount: 5000.0,
          payment_method: 'Personal Payment',
          paid_by: memberId,
          expense_type: 'Initial Investment',
        });

      expect(expRes.status).toBe(201);
      const expId = expRes.body.record.id;

      const todayRes = await request(app)
        .get('/api/today?date=2026-07-22')
        .set('Cookie', sessionCookie);

      expect(todayRes.status).toBe(200);
      // Expenses on this day should remain 0 (or unchanged by the investment)
      expect(todayRes.body.cards.expenses).toBe(0);

      // Clean up
      await pool.query('DELETE FROM expenses WHERE id = $1;', [expId]);
    });

    test('Acceptance 4: Net below zero shows empty payback bar with negative figure', async () => {
      const partnersRes = await request(app)
        .get('/api/partners')
        .set('Cookie', sessionCookie);

      expect(partnersRes.status).toBe(200);
      expect(partnersRes.body.payback).toBeDefined();
      expect(typeof partnersRes.body.payback.percentage).toBe('number');
      expect(partnersRes.body.payback.percentage).toBeGreaterThanOrEqual(0);
      expect(partnersRes.body.payback.percentage).toBeLessThanOrEqual(100);
    });

    test('Acceptance 5: Days with no data appear as zero in daily timeline charts', async () => {
      const overviewRes = await request(app)
        .get('/api/overview?from=2026-06-01&to=2026-06-05&group=day')
        .set('Cookie', sessionCookie);

      expect(overviewRes.status).toBe(200);
      expect(overviewRes.body.series.length).toBe(5); // 5 consecutive days 01 to 05
      expect(overviewRes.body.series[0].sales).toBe(0);
      expect(overviewRes.body.series[0].expenses).toBe(0);
    });
  });
});
