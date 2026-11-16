import { pool } from './index.js';

async function check() {
  const res = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('Current tables in DB:', res.rows.map(r => r.table_name));
  await pool.end();
}

check().catch(console.error);

