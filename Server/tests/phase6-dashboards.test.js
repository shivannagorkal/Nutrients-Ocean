import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../src/app.js';
import { pool } from '../src/db/index.js';
import { getTodayISTDateString, offsetDate } from '../src/utils/date.js';

describe('Phase 6 Sales & Expenses Dashboards Verification', () => {
  jest.setTimeout(30000);

  let sessionCookie = '';
  let memberShivannaId = '';
  let memberUdayId = '';
  let oatsProductId = '';
  let otherProductId = '';
  let categoryDairyId = '';
  let categoryOtherId = '';

  const testFrom = '2026-05-01';
  const testTo = '2026-05-15'; // 15 days

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
    categoryOtherId = categories.rows.find((c) => c.name === 'Other').id;

    // 3. Insert specific test sales in May 2026
    // Day 1 (May 01): 2 oats = 158 (UPI)
    // Day 5 (May 05): 1 other = 100 (Cash)
    // Day 10 (May 10): 3 oats = 237 (UPI)
    await pool.query(
      `INSERT INTO sales (timestamp, sale_date, product_id, quantity, price_per_item, total_amount, payment_method, received_by, notes)
       VALUES 
        ('2026-05-01 10:00:00+05:30', '2026-05-01', $1, 2, 79, 158.00, 'UPI', $2, 'PHASE6_TEST May 1'),
        ('2026-05-05 14:30:00+05:30', '2026-05-05', $3, 1, 99, 100.00, 'Cash', $2, 'PHASE6_TEST May 5 Other'),
        ('2026-05-10 19:45:00+05:30', '2026-05-10', $1, 3, 79, 237.00, 'UPI', $2, 'PHASE6_TEST May 10');`,
      [oatsProductId, memberShivannaId, otherProductId]
    );

    // 4. Insert specific test expenses in May 2026
    // Day 2 (May 02): Regular business expense 80.00 (UPI)
    // Day 5 (May 05): Initial investment 2000.00 (Personal Payment)
    // Day 12 (May 12): Regular business expense 120.00 (Cash)
    await pool.query(
      `INSERT INTO expenses (timestamp, expense_date, category_id, description, amount, payment_method, paid_by, expense_type, notes)
       VALUES 
        ('2026-05-02 09:00:00+05:30', '2026-05-02', $1, 'Test Milk Powder', 80.00, 'UPI', $2, 'Regular Business Expense', 'PHASE6_TEST May 2'),
        ('2026-05-05 11:00:00+05:30', '2026-05-05', $3, 'Test Gas Stove', 2000.00, 'Personal Payment', $2, 'Initial Investment', 'PHASE6_TEST May 5 Investment'),
        ('2026-05-12 16:00:00+05:30', '2026-05-12', $1, 'Test Fresh Milk', 120.00, 'Cash', $2, 'Regular Business Expense', 'PHASE6_TEST May 12');`,
      [categoryDairyId, memberShivannaId, categoryOtherId]
    );
  });

  afterAll(async () => {
    await pool.query("DELETE FROM sales WHERE notes LIKE '%PHASE6_TEST%'");
    await pool.query("DELETE FROM expenses WHERE notes LIKE '%PHASE6_TEST%'");
    await pool.end();
  });

  // =========================================================================
  // 1. GET /api/sales Dashboard Endpoint
  // =========================================================================
  describe('1. GET /api/sales Endpoint', () => {
    test('Requires authentication', async () => {
      const res = await request(app).get('/api/sales');
      expect(res.status).toBe(401);
    });

    test('Rejects invalid date or from > to with 400', async () => {
      const res = await request(app)
        .get('/api/sales?from=2026-05-15&to=2026-05-01')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('Returns sales cards, zero-filled continuous timeline, product table, payment split, hourly data', async () => {
      const res = await request(app)
        .get(`/api/sales?from=${testFrom}&to=${testTo}&group=day`)
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      const data = res.body;

      // Cards
      // Sales: 158 + 100 + 237 = 495.00
      expect(data.cards.sales).toBe(495.0);
      expect(data.cards.orders).toBe(3);
      expect(data.cards.itemsSold).toBe(6);
      expect(data.cards.avgPerOrder).toBe(165.0); // 495 / 3 = 165
      expect(data.cards.bestDay.date).toBe('2026-05-10');
      expect(data.cards.bestDay.sales).toBe(237.0);
      expect(data.cards.avgDailySales).toBe(33.0); // 495 / 15 days = 33

      // Continuous timeline series (15 days, no gaps!)
      expect(data.chartSeries.length).toBe(15);
      expect(data.chartSeries[0].date).toBe('2026-05-01');
      expect(data.chartSeries[0].sales).toBe(158.0);
      expect(data.chartSeries[0].growthPct).toBeNull(); // First period is n/a

      // Day 2 had 0 sales -> must be 0, not skipped!
      const day2 = data.chartSeries.find((d) => d.date === '2026-05-02');
      expect(day2).toBeDefined();
      expect(day2.sales).toBe(0);
      expect(day2.orders).toBe(0);

      // Day 5 had 100 sales
      const day5 = data.chartSeries.find((d) => d.date === '2026-05-05');
      expect(day5.sales).toBe(100.0);

      // Cumulative sales is non-decreasing and finishes at total sales
      expect(data.chartSeries[14].cumulativeSales).toBe(495.0);

      // 7-day moving average is populated
      expect(data.chartSeries[0].movingAverage7Day).toBeDefined();
      expect(typeof data.chartSeries[0].movingAverage7Day).toBe('number');

      // Product Table
      const mixedRow = data.productTable.find((p) => p.isMixed || p.productName === 'Mixed / other orders');
      expect(mixedRow).toBeDefined();
      expect(mixedRow.sales).toBe(100.0);

      const oatsRow = data.productTable.find((p) => p.productName === 'Nightout Oats');
      expect(oatsRow.units).toBe(5); // 2 + 3
      expect(oatsRow.sales).toBe(395.0); // 158 + 237

      // Payment Split (Cash: 100, UPI: 395)
      const upi = data.paymentSplit.find((p) => p.method === 'UPI');
      const cash = data.paymentSplit.find((p) => p.method === 'Cash');
      expect(upi.amount).toBe(395.0);
      expect(cash.amount).toBe(100.0);

      // Hourly Data (24 hours)
      expect(data.hourlyData.length).toBe(24);
      // Hour 10 had 10:00 AM sale
      expect(data.hourlyData[10].orders).toBe(1);
      expect(data.hourlyData[10].sales).toBe(158.0);
      // Hour 14 had 2:30 PM sale
      expect(data.hourlyData[14].orders).toBe(1);
      expect(data.hourlyData[14].sales).toBe(100.0);
      // Hour 19 had 7:45 PM sale
      expect(data.hourlyData[19].orders).toBe(1);
      expect(data.hourlyData[19].sales).toBe(237.0);
    });

    test('Grouping by week and month aggregates series accurately', async () => {
      const resWeek = await request(app)
        .get(`/api/sales?from=${testFrom}&to=${testTo}&group=week`)
        .set('Cookie', sessionCookie);

      expect(resWeek.status).toBe(200);
      expect(resWeek.body.chartSeries.length).toBeGreaterThan(0);
      expect(resWeek.body.chartSeries.length).toBeLessThan(15);

      const resMonth = await request(app)
        .get(`/api/sales?from=${testFrom}&to=${testTo}&group=month`)
        .set('Cookie', sessionCookie);

      expect(resMonth.status).toBe(200);
      expect(resMonth.body.chartSeries.length).toBe(1); // All 15 days fall in 2026-05
      expect(resMonth.body.chartSeries[0].sales).toBe(495.0);
    });
  });

  // =========================================================================
  // 2. GET /api/expenses Dashboard Endpoint
  // =========================================================================
  describe('2. GET /api/expenses Endpoint', () => {
    test('Requires authentication', async () => {
      const res = await request(app).get('/api/expenses');
      expect(res.status).toBe(401);
    });

    test('Returns expense cards, Net, category table, payback point, and excludes investment from regular expenses', async () => {
      const res = await request(app)
        .get(`/api/expenses?from=${testFrom}&to=${testTo}&group=day`)
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      const data = res.body;

      // Regular expenses = 80 + 120 = 200.00 (Initial Investment 2000 is excluded!)
      expect(data.cards.expenses).toBe(200.0);
      expect(data.cards.investmentTotal).toBe(2000.0);
      expect(data.cards.investmentAllTime).toBeGreaterThanOrEqual(2000.0);

      // Net = Sales (495) - Expenses (200) = 295.00
      expect(data.cards.net).toBe(295.0);
      expect(data.cards.netNote).toBe(
        'Simple cash view. Ingredients count when bought, not when sold, so early numbers are rough.'
      );

      // Biggest Category
      expect(data.cards.biggestCategory.categoryName).toBe('Milk & Dairy Products');
      expect(data.cards.biggestCategory.amount).toBe(200.0);

      // Category Table
      const dairy = data.categoryTable.find((c) => c.categoryName === 'Milk & Dairy Products');
      expect(dairy).toBeDefined();
      expect(dairy.amount).toBe(200.0);
      expect(dairy.count).toBe(2);

      // Payment Split
      const upi = data.paymentSplit.find((p) => p.method === 'UPI');
      const cash = data.paymentSplit.find((p) => p.method === 'Cash');
      expect(upi.amount).toBe(80.0);
      expect(cash.amount).toBe(120.0);

      // Investment list contains the 2000.00 investment
      expect(data.investmentList.length).toBeGreaterThanOrEqual(1);
      const inv = data.investmentList.find((i) => i.notes.includes('PHASE6_TEST'));
      expect(inv.amount).toBe(2000.0);

      // Chart series contains paybackPoint
      expect(data.chartSeries[0].paybackPoint).toBe(data.cards.investmentAllTime);
    });
  });

  // =========================================================================
  // 3. GET /api/overview Dashboard Endpoint
  // =========================================================================
  describe('3. GET /api/overview Endpoint', () => {
    test('Requires authentication', async () => {
      const res = await request(app).get('/api/overview');
      expect(res.status).toBe(401);
    });

    test('Returns combined sales vs expenses vs net, payback progress, and growth %', async () => {
      const res = await request(app)
        .get(`/api/overview?from=${testFrom}&to=${testTo}&group=day`)
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      const data = res.body;

      expect(data.cards.sales).toBe(495.0);
      expect(data.cards.expenses).toBe(200.0);
      expect(data.cards.net).toBe(295.0);
      expect(data.cards.payback).toBeDefined();
      expect(data.cards.payback.percentage).toBeDefined();

      expect(data.series.length).toBe(15);
      expect(data.series[0].sales).toBe(158.0);
      expect(data.series[0].expenses).toBe(0);
      expect(data.series[0].net).toBe(158.0);

      expect(data.series[1].date).toBe('2026-05-02');
      expect(data.series[1].expenses).toBe(80.0);
      expect(data.series[1].net).toBe(-80.0); // Red negative
    });
  });
});
