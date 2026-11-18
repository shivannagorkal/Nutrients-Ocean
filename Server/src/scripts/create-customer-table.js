import { query, pool } from '../db/index.js';

async function createCustomerTable() {
  try {
    console.log('Ensuring pgcrypto extension...');
    await query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    console.log('Ensuring customers table exists...');
    await query(`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(15) NOT NULL UNIQUE,
        full_name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log('Ensuring idx_customers_phone index exists...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    `);

    console.log('Customer table verified/created successfully!');
  } catch (err) {
    console.error('Failed to create customer table:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createCustomerTable();
