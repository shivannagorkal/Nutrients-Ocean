import { pool } from './index.js';

export async function seed() {
  console.log('--- Seeding Initial Data ---');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Seed members
    const members = [
      { name: 'Shivanna Gorkal', email: 'shivanna@nutrientsocean.com' },
      { name: 'Uday K S', email: 'uday@nutrientsocean.com' },
      { name: 'Sachin Kumar Dadmi', email: 'sachin@nutrientsocean.com' },
    ];

    for (const m of members) {
      await client.query(
        `INSERT INTO members (name, email)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET email = EXCLUDED.email;`,
        [m.name, m.email]
      );
    }
    console.log(`Seeded ${members.length} members.`);

    // 2. Seed products
    const products = [
      { name: 'Nightout Oats', default_price: 79.00, is_active: true },
      { name: 'High Protein Oats', default_price: 99.00, is_active: true },
      { name: 'Dry Fruit Sandwich', default_price: 59.00, is_active: true },
      { name: 'Normal Sandwich', default_price: 49.00, is_active: true },
      { name: 'Other', default_price: 0.00, is_active: true },
    ];

    for (const p of products) {
      await client.query(
        `INSERT INTO products (name, default_price, is_active)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE 
         SET default_price = EXCLUDED.default_price, is_active = EXCLUDED.is_active;`,
        [p.name, p.default_price, p.is_active]
      );
    }
    console.log(`Seeded ${products.length} products.`);

    // 3. Seed expense categories
    const categories = [
      'Fruits & Dry Fruits',
      'Milk & Dairy Products',
      'Ingredients / Raw Materials',
      'Stall Maintenance',
      'Equipment / Furniture',
      'Other',
    ];

    for (const name of categories) {
      await client.query(
        `INSERT INTO expense_categories (name)
         VALUES ($1)
         ON CONFLICT (name) DO NOTHING;`,
        [name]
      );
    }
    console.log(`Seeded ${categories.length} expense categories.`);

    await client.query('COMMIT');
    console.log('✅ Seeding completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Auto-run when invoked directly
if (process.argv[1]?.endsWith('seed.js')) {
  seed().then(() => pool.end()).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

