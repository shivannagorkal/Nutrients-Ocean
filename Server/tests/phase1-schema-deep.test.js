import { pool } from '../src/db/index.js';

describe('Deep Schema Verification against Build Plan', () => {
  afterAll(async () => {
    await pool.end();
  });

  test('sales table schema matches build plan Section 4', async () => {
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'sales'
      ORDER BY ordinal_position;
    `);
    const cols = res.rows.map(r => r.column_name);
    expect(cols).toContain('id');
    expect(cols).toContain('timestamp');
    expect(cols).toContain('sale_date');
    expect(cols).toContain('product_id');
    expect(cols).toContain('quantity');
    expect(cols).toContain('price_per_item');
    expect(cols).toContain('total_amount');
    expect(cols).toContain('payment_method');
    expect(cols).toContain('received_by');
    expect(cols).toContain('notes');
    expect(cols).toContain('is_mixed');
    expect(cols).toContain('source');
    expect(cols).toContain('import_row_ref');
    expect(cols).toContain('created_at');
    expect(cols).toContain('updated_at');
    expect(cols).toContain('created_by');
    expect(cols).toContain('deleted_at');
  });

  test('expenses table schema matches build plan Section 4', async () => {
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'expenses'
      ORDER BY ordinal_position;
    `);
    const cols = res.rows.map(r => r.column_name);
    expect(cols).toContain('id');
    expect(cols).toContain('timestamp');
    expect(cols).toContain('expense_date');
    expect(cols).toContain('category_id');
    expect(cols).toContain('description');
    expect(cols).toContain('amount');
    expect(cols).toContain('payment_method');
    expect(cols).toContain('paid_by');
    expect(cols).toContain('expense_type');
    expect(cols).toContain('notes');
    expect(cols).toContain('source');
    expect(cols).toContain('import_row_ref');
    expect(cols).toContain('created_at');
    expect(cols).toContain('updated_at');
    expect(cols).toContain('created_by');
    expect(cols).toContain('deleted_at');
  });

  test('settlements table schema matches build plan Section 4', async () => {
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'settlements'
      ORDER BY ordinal_position;
    `);
    const cols = res.rows.map(r => r.column_name);
    expect(cols).toContain('id');
    expect(cols).toContain('settlement_date');
    expect(cols).toContain('amount');
    expect(cols).toContain('paid_by');
    expect(cols).toContain('paid_to');
    expect(cols).toContain('notes');
    expect(cols).toContain('created_at');
    expect(cols).toContain('updated_at');
    expect(cols).toContain('created_by');
    expect(cols).toContain('deleted_at');
  });

  test('audit_log table schema matches build plan Section 4', async () => {
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'audit_log'
      ORDER BY ordinal_position;
    `);
    const cols = res.rows.map(r => r.column_name);
    expect(cols).toContain('id');
    expect(cols).toContain('user_email');
    expect(cols).toContain('action');
    expect(cols).toContain('entity');
    expect(cols).toContain('entity_id');
    expect(cols).toContain('before');
    expect(cols).toContain('after');
    expect(cols).toContain('at');
  });

  test('Check constraint: settlements paid_by != paid_to is enforced', async () => {
    const memberRes = await pool.query('SELECT id FROM members LIMIT 1;');
    const memberId = memberRes.rows[0].id;

    await expect(pool.query(`
      INSERT INTO settlements (settlement_date, amount, paid_by, paid_to)
      VALUES (CURRENT_DATE, 100, $1, $1);
    `, [memberId])).rejects.toThrow();
  });
});

