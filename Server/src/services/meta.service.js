import { pool } from '../db/index.js';

export class MetaService {
  static async getMetadata() {
    const [membersRes, productsRes, categoriesRes] = await Promise.all([
      pool.query('SELECT id, name, email FROM members ORDER BY name ASC;'),
      pool.query('SELECT id, name, default_price, is_active FROM products ORDER BY name ASC;'),
      pool.query('SELECT id, name FROM expense_categories ORDER BY name ASC;'),
    ]);

    return {
      members: membersRes.rows,
      products: productsRes.rows.map((p) => ({
        ...p,
        default_price: parseFloat(p.default_price),
      })),
      categories: categoriesRes.rows,
      enums: {
        payment_methods: ['UPI', 'Cash'],
        expense_payment_methods: ['UPI', 'Cash', 'Personal Payment'],
        expense_types: ['Regular Business Expense', 'Initial Investment'],
      },
    };
  }
}

export default MetaService;
