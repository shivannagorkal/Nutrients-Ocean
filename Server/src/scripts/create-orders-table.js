import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { query, pool } from '../db/index.js';

async function createOrdersTables() {
  try {
    console.log('Ensuring pgcrypto extension...');
    await query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    console.log('Ensuring orders table exists (without modifying existing data)...');
    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number VARCHAR(32) NOT NULL UNIQUE,
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(15) NOT NULL,
        subtotal_paise INTEGER NOT NULL,
        delivery_fee_paise INTEGER NOT NULL DEFAULT 0,
        total_paise INTEGER NOT NULL,
        fulfillment_type VARCHAR(20) NOT NULL CHECK (fulfillment_type IN ('PICKUP', 'DELIVERY')),
        delivery_bracket VARCHAR(20) DEFAULT 'NONE',
        delivery_address TEXT,
        delivery_lat NUMERIC(10, 7),
        delivery_lng NUMERIC(10, 7),
        collection_slot VARCHAR(20) NOT NULL CHECK (collection_slot IN ('MORNING', 'EVENING')),
        scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
        payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('PAY_AT_STALL', 'UPI_DIRECT', 'RAZORPAY')),
        payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED')),
        order_status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED' CHECK (order_status IN ('RECEIVED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED')),
        razorpay_order_id VARCHAR(100),
        razorpay_payment_id VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log('Ensuring order_items table exists...');
    await query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id VARCHAR(100) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        flavor VARCHAR(100),
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit_price_paise INTEGER NOT NULL,
        total_price_paise INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log('Ensuring order indexes exist...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status_date ON orders(order_status, scheduled_date);
      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    `);

    console.log('Orders and order_items tables verified/created successfully!');
  } catch (err) {
    console.error('Failed to create orders tables:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createOrdersTables();
