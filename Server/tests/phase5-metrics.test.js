import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../src/app.js';
import { pool } from '../src/db/index.js';
import {
  round2,
  calculateSales,
  calculateOrders,
  calculateItemsSold,
  calculateAveragePerOrder,
  calculateExpenses,
  calculateInvestment,
  calculateNet,
  calculatePaybackProgress,
  calculatePaidPersonally,
  calculateReimbursed,
  calculateStillOwed,
  calculateEstimatedRevenueBalance,
  calculateProductBreakdown,
  calculatePaymentSplit,
  calculateReceivedBySplit,
  calculateComparison,
  NET_NOTE,
} from '../src/services/metrics.service.js';
import { getTodayISTDateString, offsetDate } from '../src/utils/date.js';

describe('Phase 5 Metrics Engine & Today View Verification', () => {
  jest.setTimeout(30000);

  let sessionCookie = '';
  let memberShivannaId = '';
  let memberUdayId = '';
  let oatsProductId = '';
  let otherProductId = '';
  let categoryDairyId = '';
  let categoryOtherId = '';

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
  });

  afterAll(async () => {
    // Clean up any test sales and expenses
    await pool.query("DELETE FROM sales WHERE notes LIKE '%PHASE5_TEST%'");
    await pool.query("DELETE FROM expenses WHERE notes LIKE '%PHASE5_TEST%'");
    await pool.end();
  });

  // =========================================================================
  // Section 1: Canonical Pure Metrics Unit Tests
  // =========================================================================
  describe('1. Pure Metrics Engine Unit Tests (Single Source of Truth)', () => {
    test('Sales is sum of total_amount, NEVER quantity * price', () => {
      // Customer bought 1 oats (price 99) but paid 100
      const mockSales = [
        { quantity: 1, price_per_item: 99, total_amount: 100 },
        { quantity: 2, price_per_item: 79, total_amount: 158 },
      ];

      const totalSales = calculateSales(mockSales);
      expect(totalSales).toBe(258.0); // 100 + 158 = 258, NOT 99 + 158 = 257
    });

    test('Orders is count of sales rows', () => {
      const mockSales = [{ total_amount: 100 }, { total_amount: 200 }, { total_amount: 300 }];
      expect(calculateOrders(mockSales)).toBe(3);
      expect(calculateOrders([])).toBe(0);
    });

    test('Items sold is sum of quantity', () => {
      const mockSales = [{ quantity: 2 }, { quantity: 5 }, { quantity: 1 }];
      expect(calculateItemsSold(mockSales)).toBe(8);
      expect(calculateItemsSold([])).toBe(0);
    });

    test('Average per order is Sales / Orders, returns 0 if no orders', () => {
      expect(calculateAveragePerOrder(258, 2)).toBe(129.0);
      expect(calculateAveragePerOrder(100, 3)).toBe(33.33);
      expect(calculateAveragePerOrder(0, 0)).toBe(0);
    });

    test('Expenses includes ONLY Regular Business Expense, NEVER Initial Investment', () => {
      const mockExpenses = [
        { amount: 500, expense_type: 'Regular Business Expense' },
        { amount: 250, expense_type: 'Regular Business Expense' },
        { amount: 5000, expense_type: 'Initial Investment' }, // Must be ignored
      ];

      expect(calculateExpenses(mockExpenses)).toBe(750.0);
    });

    test('Investment sums Initial Investment separately per member and in total', () => {
      const mockExpenses = [
        { amount: 500, expense_type: 'Regular Business Expense', paid_by_name: 'Shivanna' },
        { amount: 3000, expense_type: 'Initial Investment', paid_by_name: 'Shivanna' },
        { amount: 2000, expense_type: 'Initial Investment', paid_by_name: 'Sachin' },
        { amount: 1000, expense_type: 'Initial Investment', paid_by_name: 'Sachin' },
      ];

      const result = calculateInvestment(mockExpenses);
      expect(result.total).toBe(6000.0);
      expect(result.byMember['Shivanna']).toBe(3000.0);
      expect(result.byMember['Sachin']).toBe(3000.0);
      expect(result.byMember['Uday']).toBeUndefined();
    });

    test('Net = Sales - Expenses, with exact canonical disclaimer note', () => {
      const sales = 1000;
      const expenses = 450;
      expect(calculateNet(sales, expenses)).toBe(550.0);
      expect(calculateNet(200, 500)).toBe(-300.0);
      expect(NET_NOTE).toBe(
        'Simple cash view. Ingredients count when bought, not when sold, so early numbers are rough.'
      );
    });

    test('Payback progress is Net (all time) / total Investment, empty if Net <= 0', () => {
      // Positive net
      const p1 = calculatePaybackProgress(3624, 7248);
      expect(p1.ratio).toBe(0.5);
      expect(p1.percentage).toBe(50.0);

      // Negative net
      const p2 = calculatePaybackProgress(-500, 7248);
      expect(p2.ratio).toBe(0);
      expect(p2.percentage).toBe(0);

      // Zero investment
      const p3 = calculatePaybackProgress(1000, 0);
      expect(p3.ratio).toBe(0);
      expect(p3.percentage).toBe(0);
    });

    test('Product breakdown displays "Mixed / other orders" for Other product', () => {
      const mockSales = [
        { product_id: 'p1', product_name: 'Nightout Oats', quantity: 2, total_amount: 158, is_mixed: false },
        { product_id: 'p2', product_name: 'Other', quantity: 1, total_amount: 100, is_mixed: true },
        { product_id: 'p1', product_name: 'Nightout Oats', quantity: 1, total_amount: 79, is_mixed: false },
      ];

      const breakdown = calculateProductBreakdown(mockSales);
      expect(breakdown.length).toBe(2);

      const oats = breakdown.find((p) => p.productId === 'p1');
      expect(oats.productName).toBe('Nightout Oats');
      expect(oats.units).toBe(3);
      expect(oats.sales).toBe(237.0);

      const mixed = breakdown.find((p) => p.productId === 'p2');
      expect(mixed.productName).toBe('Mixed / other orders');
      expect(mixed.units).toBe(1);
      expect(mixed.sales).toBe(100.0);
      expect(mixed.isMixed).toBe(true);
    });

    test('Cash / UPI payment split calculates amounts and percentages correctly', () => {
      const mockSales = [
        { payment_method: 'Cash', total_amount: 200 },
        { payment_method: 'UPI', total_amount: 800 },
      ];

      const split = calculatePaymentSplit(mockSales);
      const upi = split.find((s) => s.method === 'UPI');
      const cash = split.find((s) => s.method === 'Cash');

      expect(upi.amount).toBe(800.0);
      expect(upi.percentage).toBe(80.0);
      expect(upi.count).toBe(1);

      expect(cash.amount).toBe(200.0);
      expect(cash.percentage).toBe(20.0);
      expect(cash.count).toBe(1);
    });

    test('Partner balances: Paid personally, Reimbursed, Still owed, Estimated balance', () => {
      const mockExpenses = [
        { paid_by: 'm1', amount: 500, payment_method: 'Personal Payment', expense_type: 'Regular Business Expense' },
        { paid_by: 'm1', amount: 200, payment_method: 'UPI', expense_type: 'Regular Business Expense' }, // Not personal
        { paid_by: 'm2', amount: 300, payment_method: 'Personal Payment', expense_type: 'Regular Business Expense' },
      ];

      const mockSettlements = [
        { paid_to: 'm1', amount: 400 },
        { paid_to: 'm2', amount: 350 }, // Overpaid
      ];

      const paidPersonally = calculatePaidPersonally(mockExpenses);
      expect(paidPersonally['m1']).toBe(500.0);
      expect(paidPersonally['m2']).toBe(300.0);

      const reimbursed = calculateReimbursed(mockSettlements);
      expect(reimbursed['m1']).toBe(400.0);
      expect(reimbursed['m2']).toBe(350.0);

      expect(calculateStillOwed(paidPersonally['m1'], reimbursed['m1'])).toBe(100.0);
      expect(calculateStillOwed(paidPersonally['m2'], reimbursed['m2'])).toBe(-50.0); // Overpaid!

      // Estimated revenue balance: Total Sales - non-personal regular expenses - total reimbursed
      // Sales: 5000, Non-personal regular expenses: 200, Total reimbursed: 750
      const estBalance = calculateEstimatedRevenueBalance(5000, 200, 750);
      expect(estBalance).toBe(4050.0);
    });

    test('Comparison helper handles zero baseline gracefully without NaN', () => {
      // Normal comparison
      const cmp1 = calculateComparison(150, 100);
      expect(cmp1.diff).toBe(50.0);
      expect(cmp1.percentChange).toBe(50.0);

      // Previous was 0, current is 100
      const cmp2 = calculateComparison(100, 0);
      expect(cmp2.diff).toBe(100.0);
      expect(cmp2.percentChange).toBeNull();

      // Both zero
      const cmp3 = calculateComparison(0, 0);
      expect(cmp3.diff).toBe(0);
      expect(cmp3.percentChange).toBe(0);
    });
  });

  // =========================================================================
  // Section 2: API Endpoint GET /api/today Integration Tests
  // =========================================================================
  describe('2. GET /api/today Endpoint', () => {
    const testDate = '2026-06-15';
    const yesterdayDate = '2026-06-14';
    const lastWeekDate = '2026-06-08';

    beforeAll(async () => {
      // Insert test sales for testDate
      await pool.query(
        `INSERT INTO sales (sale_date, product_id, quantity, price_per_item, total_amount, payment_method, received_by, notes)
         VALUES 
          ($1, $2, 2, 79, 158.00, 'UPI', $3, 'PHASE5_TEST sale 1'),
          ($1, $4, 1, 99, 100.00, 'Cash', $3, 'PHASE5_TEST Other mixed sale');`,
        [testDate, oatsProductId, memberShivannaId, otherProductId]
      );

      // Insert test expense for testDate (1 regular business expense and 1 initial investment)
      await pool.query(
        `INSERT INTO expenses (expense_date, category_id, description, amount, payment_method, paid_by, expense_type, notes)
         VALUES 
          ($1, $2, 'Test Milk', 80.00, 'UPI', $3, 'Regular Business Expense', 'PHASE5_TEST regular expense'),
          ($1, $4, 'Test Stove Investment', 5000.00, 'Personal Payment', $3, 'Initial Investment', 'PHASE5_TEST investment');`,
        [testDate, categoryDairyId, memberShivannaId, categoryOtherId]
      );

      // Insert sales for yesterday
      await pool.query(
        `INSERT INTO sales (sale_date, product_id, quantity, price_per_item, total_amount, payment_method, received_by, notes)
         VALUES ($1, $2, 1, 79, 79.00, 'UPI', $3, 'PHASE5_TEST yesterday sale');`,
        [yesterdayDate, oatsProductId, memberShivannaId]
      );

      // Insert sales for last week
      await pool.query(
        `INSERT INTO sales (sale_date, product_id, quantity, price_per_item, total_amount, payment_method, received_by, notes)
         VALUES ($1, $2, 3, 79, 237.00, 'UPI', $3, 'PHASE5_TEST last week sale');`,
        [lastWeekDate, oatsProductId, memberShivannaId]
      );
    });

    test('Requires authentication', async () => {
      const res = await request(app).get('/api/today');
      expect(res.status).toBe(401);
    });

    test('Rejects invalid date format with 400', async () => {
      const res = await request(app)
        .get('/api/today?date=invalid-date')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('Rejects date more than 1 day in the future', async () => {
      const farFutureDate = offsetDate(getTodayISTDateString(), 5);
      const res = await request(app)
        .get(`/api/today?date=${farFutureDate}`)
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('Returns correct cards, products, splits, and lists for specified date', async () => {
      const res = await request(app)
        .get(`/api/today?date=${testDate}`)
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      const data = res.body;

      // 1. Check Date
      expect(data.date).toBe(testDate);

      // 2. Check Cards
      // Sales: 158 + 100 = 258.00
      expect(data.cards.sales).toBe(258.0);
      // Orders: 2 rows
      expect(data.cards.orders).toBe(2);
      // Items sold: 2 + 1 = 3
      expect(data.cards.itemsSold).toBe(3);
      // Avg per order: 258 / 2 = 129.0
      expect(data.cards.avgPerOrder).toBe(129.0);
      // Expenses: 80.00 (Initial Investment 5000 is excluded)
      expect(data.cards.expenses).toBe(80.0);
      // Net: 258 - 80 = 178.00
      expect(data.cards.net).toBe(178.0);
      expect(data.cards.netNote).toBe(NET_NOTE);

      // 3. Check Comparisons
      // Yesterday sales was 79.00 -> diff = 258 - 79 = 179.00
      expect(data.comparisons.yesterday.sales.current).toBe(258.0);
      expect(data.comparisons.yesterday.sales.previous).toBe(79.0);
      expect(data.comparisons.yesterday.sales.diff).toBe(179.0);
      expect(data.comparisons.yesterday.sales.percentChange).toBeGreaterThan(0);

      // Last week sales was 237.00 -> diff = 258 - 237 = 21.00
      expect(data.comparisons.lastWeek.sales.current).toBe(258.0);
      expect(data.comparisons.lastWeek.sales.previous).toBe(237.0);
      expect(data.comparisons.lastWeek.sales.diff).toBe(21.0);

      // 4. Check Payment Split
      const upi = data.paymentSplit.find((p) => p.method === 'UPI');
      const cash = data.paymentSplit.find((p) => p.method === 'Cash');
      expect(upi.amount).toBe(158.0);
      expect(cash.amount).toBe(100.0);
      expect(round2(upi.percentage + cash.percentage)).toBe(100.0);

      // 5. Check Product Breakdown
      const mixedProduct = data.products.find((p) => p.isMixed || p.productName === 'Mixed / other orders');
      expect(mixedProduct).toBeDefined();
      expect(mixedProduct.productName).toBe('Mixed / other orders');
      expect(mixedProduct.units).toBe(1);
      expect(mixedProduct.sales).toBe(100.0);

      // 6. Check Sales & Expenses Lists
      expect(data.sales.length).toBeGreaterThanOrEqual(2);
      expect(data.expenses.length).toBeGreaterThanOrEqual(2);
      expect(data.sales.some((s) => s.notes.includes('PHASE5_TEST sale 1'))).toBe(true);
      expect(data.expenses.some((e) => e.description === 'Test Milk')).toBe(true);
    });

    test('Zero-data days return proper zero values without errors', async () => {
      const emptyDate = '2020-01-01';
      const res = await request(app)
        .get(`/api/today?date=${emptyDate}`)
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      const data = res.body;

      expect(data.cards.sales).toBe(0);
      expect(data.cards.orders).toBe(0);
      expect(data.cards.itemsSold).toBe(0);
      expect(data.cards.avgPerOrder).toBe(0);
      expect(data.cards.expenses).toBe(0);
      expect(data.cards.net).toBe(0);
      expect(data.sales).toEqual([]);
      expect(data.expenses).toEqual([]);
    });

    test('Soft-deleted records are excluded from today metrics', async () => {
      // Create a sale to soft-delete
      const createRes = await request(app)
        .post('/api/sales/records')
        .set('Cookie', sessionCookie)
        .send({
          sale_date: testDate,
          product_id: oatsProductId,
          quantity: 10,
          total_amount: 790.0,
          payment_method: 'Cash',
          received_by: memberShivannaId,
          notes: 'PHASE5_TEST will delete',
        });

      const saleId = createRes.body.record.id;

      // Soft delete it
      await request(app)
        .delete(`/api/sales/records/${saleId}`)
        .set('Cookie', sessionCookie);

      // Check today's sales
      const res = await request(app)
        .get(`/api/today?date=${testDate}`)
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      // Sales should still be 258.00, not 258 + 790
      expect(res.body.cards.sales).toBe(258.0);
      expect(res.body.sales.some((s) => s.id === saleId)).toBe(false);
    });
  });
});
