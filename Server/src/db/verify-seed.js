import { pool } from './index.js';

async function verifySeed() {
  const members = await pool.query('SELECT name, email FROM members ORDER BY name;');
  const products = await pool.query('SELECT name, default_price, is_active FROM products ORDER BY name;');
  const categories = await pool.query('SELECT name FROM expense_categories ORDER BY name;');

  console.log('\n--- Members ---');
  console.table(members.rows);

  console.log('\n--- Products ---');
  console.table(products.rows);

  console.log('\n--- Categories ---');
  console.table(categories.rows);

  await pool.end();
}

verifySeed().catch(console.error);

