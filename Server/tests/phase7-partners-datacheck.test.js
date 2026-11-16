import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../src/app.js';
import { pool } from '../src/db/index.js';

describe('Phase 7 Partners, Settlements & Data Check Verification', () => {
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
    await pool.query("DELETE FROM sales WHERE notes LIKE '%PHASE7_TEST%'");
    await pool.query("DELETE FROM expenses WHERE notes LIKE '%PHASE7_TEST%'");
    await pool.query("DELETE FROM settlements WHERE notes LIKE '%PHASE7_TEST%'");
    await pool.end();
  });

  // =========================================================================
  // 1. GET /api/partners Endpoint
  // =========================================================================
  describe('1. GET /api/partners Endpoint', () => {
    test('Requires authentication', async () => {
      const res = await request(app).get('/api/partners');
      expect(res.status).toBe(401);
    });

    test('Returns payback progress, per-partner balances, estimated revenue balance, and settlements', async () => {
      // Insert test initial investment for Uday: 3000
      await pool.query(
        `INSERT INTO expenses (expense_date, category_id, description, amount, payment_method, paid_by, expense_type, notes)
         VALUES ('2026-04-01', $1, 'Uday Stove', 3000.00, 'Personal Payment', $2, 'Initial Investment', 'PHASE7_TEST inv');`,
        [categoryOtherId, memberUdayId]
      );

      // Insert personal regular expense for Uday: 500
      await pool.query(
        `INSERT INTO expenses (expense_date, category_id, description, amount, payment_method, paid_by, expense_type, notes)
         VALUES ('2026-04-05', $1, 'Milk Uday Paid', 500.00, 'Personal Payment', $2, 'Regular Business Expense', 'PHASE7_TEST personal');`,
        [categoryDairyId, memberUdayId]
      );

      // Insert settlement reimbursing Uday 200 (Paid by Shivanna to Uday)
      await pool.query(
        `INSERT INTO settlements (settlement_date, amount, paid_by, paid_to, notes)
         VALUES ('2026-04-10', 200.00, $1, $2, 'PHASE7_TEST partial reimb');`,
        [memberShivannaId, memberUdayId]
      );

      const res = await request(app)
        .get('/api/partners')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      const data = res.body;

      // 1. Payback progress
      expect(data.payback).toBeDefined();
      expect(data.payback.totalInvestment).toBeGreaterThanOrEqual(3000.0);
      expect(data.payback.netAllTime).toBeDefined();

      // 2. Partner balances
      const uday = data.partners.find((p) => p.memberId === memberUdayId);
      expect(uday).toBeDefined();
      expect(uday.invested).toBeGreaterThanOrEqual(3000.0);
      expect(uday.paidPersonally).toBeGreaterThanOrEqual(500.0);
      expect(uday.reimbursed).toBeGreaterThanOrEqual(200.0);
      // Still owed = 500 - 200 = 300
      expect(uday.stillOwed).toBe(uday.paidPersonally - uday.reimbursed);
      expect(uday.isOverpaid).toBe(false);

      // 3. Estimated revenue balance
      expect(data.estimatedRevenueBalance).toBeDefined();
      expect(data.estimatedRevenueBalance.label).toBe('Estimate');
      expect(data.estimatedRevenueBalance.totalSales).toBeGreaterThanOrEqual(0);
      expect(data.estimatedRevenueBalance.estimatedBalance).toBeDefined();

      // 4. Settlements list
      expect(data.settlements.length).toBeGreaterThanOrEqual(1);
      const testSettlement = data.settlements.find((s) => s.notes === 'PHASE7_TEST partial reimb');
      expect(testSettlement).toBeDefined();
      expect(testSettlement.amount).toBe(200.0);
      expect(testSettlement.paidByName).toBe('Shivanna Gorkal');
      expect(testSettlement.paidToName).toBe('Uday K S');
    });

    test('Flags member as Overpaid when Reimbursed exceeds Paid personally', async () => {
      // Reimburse Uday an extra 1000 (now reimbursed > paid personally)
      await pool.query(
        `INSERT INTO settlements (settlement_date, amount, paid_by, paid_to, notes)
         VALUES ('2026-04-12', 1000.00, $1, $2, 'PHASE7_TEST overpaid reimb');`,
        [memberShivannaId, memberUdayId]
      );

      const res = await request(app)
        .get('/api/partners')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      const uday = res.body.partners.find((p) => p.memberId === memberUdayId);
      expect(uday.isOverpaid).toBe(true);
      expect(uday.stillOwed).toBeLessThan(0);
    });
  });

  // =========================================================================
  // 2. GET /api/data-check Endpoint
  // =========================================================================
  describe('2. GET /api/data-check Endpoint', () => {
    beforeAll(async () => {
      // Insert specific data check violation fixtures:

      // Rule 4 Violation: Duplicate entries within 10 minutes
      await pool.query(
        `INSERT INTO expenses (timestamp, expense_date, category_id, description, amount, payment_method, paid_by, expense_type, notes)
         VALUES 
          ('2026-04-15 12:00:00+05:30', '2026-04-15', $1, 'Duplicate 1', 100.00, 'UPI', $2, 'Regular Business Expense', 'PHASE7_TEST dup1'),
          ('2026-04-15 12:05:00+05:30', '2026-04-15', $1, 'Duplicate 2', 100.00, 'UPI', $2, 'Regular Business Expense', 'PHASE7_TEST dup2');`,
        [categoryDairyId, memberShivannaId]
      );

      // Rule 5 Violation: Quantity > 1 but price per item equals total amount
      await pool.query(
        `INSERT INTO sales (sale_date, product_id, quantity, price_per_item, total_amount, payment_method, received_by, notes)
         VALUES ('2026-04-16', $1, 5, 295.00, 295.00, 'Cash', $2, 'PHASE7_TEST price-equals-total');`,
        [oatsProductId, memberShivannaId]
      );

      // Rule 6 Non-violation: ₹100 for ₹99 item (diff = ₹1, <= ₹10 -> NOT flagged)
      await pool.query(
        `INSERT INTO sales (sale_date, product_id, quantity, price_per_item, total_amount, payment_method, received_by, notes)
         VALUES ('2026-04-17', $1, 1, 99.00, 100.00, 'Cash', $2, 'PHASE7_TEST small rounding 100 for 99');`,
        [oatsProductId, memberShivannaId]
      );

      // Rule 6 Violation: Sale total differs from qty * price by > ₹10
      await pool.query(
        `INSERT INTO sales (sale_date, product_id, quantity, price_per_item, total_amount, payment_method, received_by, notes)
         VALUES ('2026-04-18', $1, 2, 79.00, 250.00, 'Cash', $2, 'PHASE7_TEST diff greater than 10');`,
        [oatsProductId, memberShivannaId]
      );

      // Rule 7 Violation: "Other" product missing notes
      await pool.query(
        `INSERT INTO sales (sale_date, product_id, quantity, total_amount, payment_method, received_by, is_mixed, notes)
         VALUES ('2026-04-19', $1, 1, 50.00, 'UPI', $2, true, '   ');`,
        [otherProductId, memberShivannaId]
      );

      // Rule 9 Violation: Initial Investment paid with Cash instead of Personal Payment
      await pool.query(
        `INSERT INTO expenses (expense_date, category_id, description, amount, payment_method, paid_by, expense_type, notes)
         VALUES ('2026-04-20', $1, 'Cash Investment', 500.00, 'Cash', $2, 'Initial Investment', 'PHASE7_TEST cash investment');`,
        [categoryOtherId, memberShivannaId]
      );
    });

    test('Requires authentication', async () => {
      const res = await request(app).get('/api/data-check');
      expect(res.status).toBe(401);
    });

    test('Flags Rule 1: Overpaid partner error', async () => {
      const res = await request(app)
        .get('/api/data-check')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      const overpaid = res.body.issues.find((i) => i.rule === 'Overpaid Partner');
      expect(overpaid).toBeDefined();
      expect(overpaid.severity).toBe('error');
      expect(overpaid.message).toContain('is overpaid');
    });

    test('Flags Rule 4: Duplicate entries warning within 10 min', async () => {
      const res = await request(app)
        .get('/api/data-check')
        .set('Cookie', sessionCookie);

      const dup = res.body.issues.find((i) => i.rule === 'Possible Duplicate Entry');
      expect(dup).toBeDefined();
      expect(dup.severity).toBe('warning');
    });

    test('Flags Rule 5: Quantity > 1 but price per item equals total amount', async () => {
      const res = await request(app)
        .get('/api/data-check')
        .set('Cookie', sessionCookie);

      const priceIssue = res.body.issues.find((i) => i.rule === 'Price Column Equals Total');
      expect(priceIssue).toBeDefined();
      expect(priceIssue.severity).toBe('warning');
    });

    test('Flags Rule 6 when diff > ₹10, but DOES NOT flag small ₹100 for ₹99 rounding', async () => {
      const res = await request(app)
        .get('/api/data-check')
        .set('Cookie', sessionCookie);

      // Large diff (250 vs 158) is flagged
      const diffIssue = res.body.issues.find((i) => i.message.includes('250'));
      expect(diffIssue).toBeDefined();

      // Small rounding (100 for 99) is NOT flagged
      const smallDiffIssue = res.body.issues.find((i) => i.message.includes('small rounding 100 for 99'));
      expect(smallDiffIssue).toBeUndefined();
    });

    test('Flags Rule 7: "Other" product missing notes', async () => {
      const res = await request(app)
        .get('/api/data-check')
        .set('Cookie', sessionCookie);

      const missingNotes = res.body.issues.find((i) => i.rule === '"Other" Product Without Notes');
      expect(missingNotes).toBeDefined();
      expect(missingNotes.severity).toBe('warning');
    });

    test('Flags Rule 9: Initial investment paid with Cash instead of Personal Payment', async () => {
      const res = await request(app)
        .get('/api/data-check')
        .set('Cookie', sessionCookie);

      const paymentMethodIssue = res.body.issues.find((i) => i.rule === 'Investment Payment Method');
      expect(paymentMethodIssue).toBeDefined();
      expect(paymentMethodIssue.severity).toBe('warning');
    });

    test('Returns summary counts grouped by severity', async () => {
      const res = await request(app)
        .get('/api/data-check')
        .set('Cookie', sessionCookie);

      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.errors).toBeGreaterThanOrEqual(1);
      expect(res.body.summary.warnings).toBeGreaterThanOrEqual(4);
      expect(res.body.summary.total).toBe(
        res.body.summary.errors + res.body.summary.warnings + res.body.summary.info
      );
    });
  });
});
