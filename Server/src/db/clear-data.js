import { pool } from './index.js';

export async function clearAllData() {
  console.log('--- Clearing All Operational Data in Database ---');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE sales, expenses, settlements, audit_log CASCADE;');
    await client.query('COMMIT');
    console.log('✅ Successfully cleared tables: sales, expenses, settlements, audit_log.');

    const salesCount = await client.query('SELECT COUNT(*) FROM sales;');
    const expCount = await client.query('SELECT COUNT(*) FROM expenses;');
    const settCount = await client.query('SELECT COUNT(*) FROM settlements;');
    console.log(`Current counts: sales=${salesCount.rows[0].count}, expenses=${expCount.rows[0].count}, settlements=${settCount.rows[0].count}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to clear data:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1]?.endsWith('clear-data.js')) {
  clearAllData().then(() => pool.end()).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
