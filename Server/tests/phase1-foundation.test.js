import request from 'supertest';
import app from '../src/app.js';
import { pool } from '../src/db/index.js';

describe('Phase 1 Foundation Verification', () => {
  afterAll(async () => {
    await pool.end();
  });

  test('GET /api/health returns 200 and { ok: true }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test('Database connection pool is healthy', async () => {
    const res = await pool.query('SELECT 1 as val');
    expect(res.rows[0].val).toBe(1);
  });

  test('All 7 tables exist in Neon PostgreSQL', async () => {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = res.rows.map(r => r.table_name);
    expect(tables).toEqual([
      'audit_log',
      'expense_categories',
      'expenses',
      'members',
      'products',
      'sales',
      'settlements'
    ]);
  });

  test('Initial members are correctly seeded', async () => {
    const res = await pool.query('SELECT name FROM members ORDER BY name;');
    const names = res.rows.map(r => r.name);
    expect(names).toEqual([
      'Sachin Kumar Dadmi',
      'Shivanna Gorkal',
      'Uday K S'
    ]);
  });

  test('Initial products including "Other" are correctly seeded', async () => {
    const res = await pool.query('SELECT name, default_price FROM products ORDER BY name;');
    const productMap = Object.fromEntries(res.rows.map(r => [r.name, parseFloat(r.default_price)]));
    expect(productMap).toEqual({
      'Dry Fruit Sandwich': 59.00,
      'High Protein Oats': 99.00,
      'Nightout Oats': 79.00,
      'Normal Sandwich': 49.00,
      'Other': 0.00,
    });
  });

  test('Initial expense categories are correctly seeded', async () => {
    const res = await pool.query('SELECT name FROM expense_categories ORDER BY name;');
    const categories = res.rows.map(r => r.name);
    expect(categories).toEqual([
      'Equipment / Furniture',
      'Fruits & Dry Fruits',
      'Ingredients / Raw Materials',
      'Milk & Dairy Products',
      'Other',
      'Stall Maintenance'
    ]);
  });
});

