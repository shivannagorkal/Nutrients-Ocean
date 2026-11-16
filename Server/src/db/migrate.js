import { pool } from './index.js';

export async function migrate({ dropLegacy = false } = {}) {
  console.log('--- Running PostgreSQL Schema Migrations ---');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Enable pgcrypto for gen_random_uuid()
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    if (dropLegacy) {
      console.log('Dropping legacy/old tables...');
      const legacyTables = [
        'subscription_freezes', 'subscription_plans', 'customer_subscriptions',
        'customer_order_items', 'customer_orders', 'customers',
        'daily_redemptions', 'daily_closing_accounts', 'daily_closings',
        'cash_transactions', 'cash_transfers', 'cash_accounts',
        'reinvestment_allocations', 'investments', 'refund_items', 'refunds',
        'payment_transactions', 'payments', 'sale_item_ingredients', 'sale_items',
        'stock_movements', 'inventory', 'purchase_items', 'purchases',
        'recipe_items', 'recipes', 'admins', 'businesses', '_prisma_migrations',
        'sales', 'expenses', 'settlements', 'audit_log', 'products', 'expense_categories', 'members'
      ];
      for (const t of legacyTables) {
        await client.query(`DROP TABLE IF EXISTS "${t}" CASCADE;`);
      }
      console.log('Legacy tables dropped.');
    }

    // 1. members
    await client.query(`
      CREATE TABLE IF NOT EXISTS members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. products
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        default_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. expense_categories
    await client.query(`
      CREATE TABLE IF NOT EXISTS expense_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 4. sales
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        sale_date DATE NOT NULL,
        product_id UUID NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        price_per_item NUMERIC(12,2),
        total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
        payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('UPI', 'Cash')),
        received_by UUID NOT NULL REFERENCES members(id),
        notes TEXT,
        is_mixed BOOLEAN NOT NULL DEFAULT false,
        source VARCHAR(20) NOT NULL DEFAULT 'app' CHECK (source IN ('app', 'import')),
        import_row_ref VARCHAR(255),
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );
    `);

    // 5. expenses
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expense_date DATE NOT NULL,
        category_id UUID NOT NULL REFERENCES expense_categories(id),
        description VARCHAR(500) NOT NULL,
        amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
        payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('UPI', 'Cash', 'Personal Payment')),
        paid_by UUID NOT NULL REFERENCES members(id),
        expense_type VARCHAR(50) NOT NULL CHECK (expense_type IN ('Regular Business Expense', 'Initial Investment')),
        notes TEXT,
        source VARCHAR(20) NOT NULL DEFAULT 'app' CHECK (source IN ('app', 'import')),
        import_row_ref VARCHAR(255),
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );
    `);

    // 6. settlements
    await client.query(`
      CREATE TABLE IF NOT EXISTS settlements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        settlement_date DATE NOT NULL,
        amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
        paid_by UUID NOT NULL REFERENCES members(id),
        paid_to UUID NOT NULL REFERENCES members(id),
        notes TEXT,
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        CONSTRAINT settlements_paid_by_not_equal_paid_to CHECK (paid_by <> paid_to)
      );
    `);

    // 7. audit_log
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_email VARCHAR(255),
        action VARCHAR(50) NOT NULL,
        entity VARCHAR(50),
        entity_id VARCHAR(255),
        before JSONB,
        after JSONB,
        at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_sales_received_by ON sales(received_by) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_expenses_expense_type ON expenses(expense_type) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paid_by) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_settlements_paid_to ON settlements(paid_to) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_settlements_settlement_date ON settlements(settlement_date) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_audit_log_at ON audit_log(at DESC);
    `);

    await client.query('COMMIT');
    console.log('✅ Migrations completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Auto-run when invoked directly
if (process.argv[1]?.endsWith('migrate.js')) {
  const dropLegacy = process.argv.includes('--drop-legacy') || process.argv.includes('--fresh');
  migrate({ dropLegacy }).then(() => pool.end()).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
