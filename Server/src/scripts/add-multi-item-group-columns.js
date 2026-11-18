import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { query, pool } from '../db/index.js';

async function addMultiItemGroupColumns() {
  try {
    console.log('Ensuring multi-item order group columns in sales table (preserving all existing data)...');
    await query(`
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS order_group_id UUID DEFAULT NULL;
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(50) DEFAULT NULL;
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255) DEFAULT NULL;
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20) DEFAULT NULL;
    `);

    console.log('Ensuring multi-item expense group columns in expenses table (preserving all existing data)...');
    await query(`
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_group_id UUID DEFAULT NULL;
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(50) DEFAULT NULL;
    `);

    console.log('Ensuring group indexes exist...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_sales_order_group ON sales(order_group_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(expense_group_id);
    `);

    console.log('Schema evolution complete: All columns and indexes verified successfully!');
  } catch (err) {
    console.error('Error adding multi-item columns:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addMultiItemGroupColumns();
