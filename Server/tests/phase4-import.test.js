import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { jest } from '@jest/globals';
import { pool } from '../src/db/index.js';
import { parseCSV, parseMDYDate, parseISTTimestamp, cleanCurrency } from '../src/scripts/csv-parser.js';
import { importSales } from '../src/scripts/import-sales.js';
import { importExpenses } from '../src/scripts/import-expenses.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Phase 4 Historical Data Import & Parser Verification', () => {
  jest.setTimeout(30000);

  const tempDir = path.join(__dirname, 'temp_fixtures');
  const tempSalesCsv = path.join(tempDir, 'test_sales.csv');
  const tempExpensesCsv = path.join(tempDir, 'test_expenses.csv');

  beforeAll(async () => {
    // Clean up any prior test import rows
    await pool.query("DELETE FROM sales WHERE source = 'import';");
    await pool.query("DELETE FROM expenses WHERE source = 'import';");

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Sample Sales CSV conforming to Google Sheets export format
    const sampleSales = `Timestamp,Date,Product Sold,Quantity,Price,Total Amount Received,Payment Method,Received By,Notes
11/8/2026 21:15:30,11/8/2026,Nightout Oats – ₹79,2,79,158,UPI,Shivanna Gorkal,Regular order
11/8/2026 21:30:00,11/8/2026,High Protein Oats – ₹99,1,99,100,Cash,Uday K S,Customer gave round 100
11/9/2026 20:00:00,11/9/2026,Other,1,0,120,UPI,Sachin Kumar Dadmi,"Special request: fruit bowl"
11/9/2026 21:00:00,11/9/2026,Dry Fruit Sandwich – ₹59,6,354,354,UPI,Shivanna Gorkal,Group order`;

    // Sample Expenses CSV conforming to Google Sheets export format
    const sampleExpenses = `Timestamp,Date,Category,Description,Amount,Payment Method,Paid By,Expense Type,Notes
11/8/2026 10:00:00,11/8/2026,"- Fruits & Dry Fruits",Apples & Bananas,"₹450.00",UPI,Shivanna Gorkal,Regular Business Expense,Weekly stall fruits
11/8/2026 11:00:00,11/8/2026,"- Milk & Dairy Products",Milk packets,280,Cash,Shivanna Gorkal,Regular Business Expen...,Daily milk
11/1/2026 09:00:00,11/1/2026,Equipment / Furniture,Stall equipment setup,"₹2,000",Personal Payment,Shivanna Gorkal,Initial Investment,Seed capital
11/1/2026 09:00:00,11/1/2026,Other,Stall fabrication advance,"₹1,000",Personal Payment,Sachin Kumar Dadmi,Initial Investment,Part 1
11/1/2026 09:05:00,11/1/2026,Other,Stall fabrication final,"₹1,000",Personal Payment,Sachin Kumar Dadmi,Initial Investment,Part 2 duplicate row to verify`;

    fs.writeFileSync(tempSalesCsv, sampleSales);
    fs.writeFileSync(tempExpensesCsv, sampleExpenses);
  });

  afterAll(async () => {
    // Clean up test imported rows and temporary fixtures
    await pool.query("DELETE FROM sales WHERE source = 'import';");
    await pool.query("DELETE FROM expenses WHERE source = 'import';");

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    await pool.end();
  });

  describe('1. CSV & Date Parsing Utilities', () => {
    test('parseCSV handles commas inside quoted fields', () => {
      const csv = `Name,Amount,Description\nShivanna,"₹1,000","Milk, Curd, Butter"`;
      const rows = parseCSV(csv);
      expect(rows.length).toBe(1);
      expect(rows[0].Amount).toBe('₹1,000');
      expect(rows[0].Description).toBe('Milk, Curd, Butter');
    });

    test('parseMDYDate strictly parses M/D/YYYY and pads to YYYY-MM-DD', () => {
      expect(parseMDYDate('11/8/2026')).toBe('2026-11-08');
      expect(parseMDYDate('1/5/2026')).toBe('2026-01-05');
      expect(parseMDYDate('12/31/2026')).toBe('2026-12-31');
      expect(() => parseMDYDate('invalid-date')).toThrow();
      expect(() => parseMDYDate('13/40/2026')).toThrow();
    });

    test('parseISTTimestamp attaches +05:30 IST timezone offset', () => {
      const ts = parseISTTimestamp('11/8/2026 21:15:30', '2026-11-08');
      expect(ts).toBe('2026-11-08T21:15:30+05:30');
    });

    test('cleanCurrency strips rupee sign, commas, and whitespace', () => {
      expect(cleanCurrency('₹1,234.50')).toBe(1234.5);
      expect(cleanCurrency('₹ 500 ')).toBe(500);
      expect(cleanCurrency(250)).toBe(250);
    });
  });

  describe('2. Sales Import Script (`importSales`)', () => {
    test('Dry run parses rows and rolls back without writing to database', async () => {
      const initialCountRes = await pool.query("SELECT COUNT(*)::int as count FROM sales WHERE source = 'import';");
      const initialCount = initialCountRes.rows[0].count;

      const report = await importSales(tempSalesCsv, { dryRun: true });
      expect(report.totalRows).toBe(4);
      expect(report.insertedCount).toBe(4);
      expect(report.totalSalesRupees).toBe(732); // 158 + 100 + 120 + 354 = 732

      const postCountRes = await pool.query("SELECT COUNT(*)::int as count FROM sales WHERE source = 'import';");
      expect(postCountRes.rows[0].count).toBe(initialCount); // Unchanged
    });

    test('Live import writes records to DB with product matching and is_mixed flag', async () => {
      const report = await importSales(tempSalesCsv, { dryRun: false });
      expect(report.insertedCount).toBe(4);

      // Verify "Other" row was imported with is_mixed = true
      const otherSale = await pool.query(`
        SELECT s.total_amount, s.is_mixed, p.name as product_name
        FROM sales s
        JOIN products p ON s.product_id = p.id
        WHERE s.notes LIKE '%fruit bowl%';
      `);
      expect(otherSale.rows.length).toBe(1);
      expect(otherSale.rows[0].is_mixed).toBe(true);
      expect(otherSale.rows[0].product_name).toBe('Other');
      expect(parseFloat(otherSale.rows[0].total_amount)).toBe(120);

      // Verify second import run is idempotent (0 inserted, 4 skipped)
      const reRunReport = await importSales(tempSalesCsv, { dryRun: false });
      expect(reRunReport.insertedCount).toBe(0);
      expect(reRunReport.skippedCount).toBe(4);
    });
  });

  describe('3. Expenses & Investments Import Script (`importExpenses`)', () => {
    test('Dry run parses rows and rolls back without writing to database', async () => {
      const initialCountRes = await pool.query("SELECT COUNT(*)::int as count FROM expenses WHERE source = 'import';");
      const initialCount = initialCountRes.rows[0].count;

      const report = await importExpenses(tempExpensesCsv, { dryRun: true });
      expect(report.totalRows).toBe(5);
      expect(report.insertedCount).toBe(5);
      expect(report.totalRegularExpenses).toBe(730); // 450 + 280
      expect(report.totalInvestment).toBe(4000); // 2000 + 1000 + 1000

      const postCountRes = await pool.query("SELECT COUNT(*)::int as count FROM expenses WHERE source = 'import';");
      expect(postCountRes.rows[0].count).toBe(initialCount);
    });

    test('Live import cleans "- " from category, matches prefix, and imports both Sachin ₹1000 rows', async () => {
      const report = await importExpenses(tempExpensesCsv, { dryRun: false });
      expect(report.insertedCount).toBe(5);

      // Verify category was cleaned (no leading "- ")
      const fruitExpense = await pool.query(`
        SELECT e.description, c.name as category_name
        FROM expenses e
        JOIN expense_categories c ON e.category_id = c.id
        WHERE e.description LIKE '%Apples & Bananas%';
      `);
      expect(fruitExpense.rows.length).toBe(1);
      expect(fruitExpense.rows[0].category_name).toBe('Fruits & Dry Fruits');

      // Verify both Sachin ₹1,000 investments are imported per Section 2 Decision 8
      const sachinInvestments = await pool.query(`
        SELECT e.amount, e.expense_type, m.name as member_name
        FROM expenses e
        JOIN members m ON e.paid_by = m.id
        WHERE m.name = 'Sachin Kumar Dadmi' AND e.source = 'import';
      `);
      expect(sachinInvestments.rows.length).toBe(2);
      expect(parseFloat(sachinInvestments.rows[0].amount)).toBe(1000);
      expect(parseFloat(sachinInvestments.rows[1].amount)).toBe(1000);

      // Verify idempotency on re-run
      const reRunReport = await importExpenses(tempExpensesCsv, { dryRun: false });
      expect(reRunReport.insertedCount).toBe(0);
      expect(reRunReport.skippedCount).toBe(5);
    });
  });
});
