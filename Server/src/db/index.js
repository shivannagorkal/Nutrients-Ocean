import dns from 'dns';
import pg from 'pg';
import dotenv from 'dotenv';

// Prioritize IPv4 DNS resolution to prevent IPv6 timeout stalls with cloud PostgreSQL (Neon/AWS)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

dotenv.config();

// Return PostgreSQL DATE (OID 1082) as exact YYYY-MM-DD string without timezone conversion
pg.types.setTypeParser(1082, (val) => val);

const { Pool } = pg;

let connectionString = process.env.DATABASE_URL || '';

if (!connectionString) {
  console.error('FATAL: DATABASE_URL is not defined in environment variables.');
}

// Silence pg v9 / Node 22 SSL mode compatibility warning
if (connectionString.includes('sslmode=require') && !connectionString.includes('uselibpqcompat=true')) {
  connectionString = connectionString.replace('sslmode=require', 'uselibpqcompat=true&sslmode=require');
}

export const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message || err);
});

/**
 * Execute parameterized query safely
 * @param {string} text - SQL query with $1, $2 parameters
 * @param {Array} params - Parameter values
 */
export async function query(text, params = []) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development' && duration > 500) {
    console.warn(`Slow query (${duration}ms):`, { text, rows: res.rowCount });
  }
  return res;
}

/**
 * Run operations within a transaction block
 * @param {Function} callback - Async function receiving client
 */
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export default {
  pool,
  query,
  withTransaction,
};

