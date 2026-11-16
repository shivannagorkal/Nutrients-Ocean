import { pool } from '../db/index.js';
import { recordAudit } from './audit.service.js';
import { AppError } from '../utils/appError.js';

export class ProductsService {
  static async listProducts() {
    const res = await pool.query(
      'SELECT id, name, default_price, is_active, created_at, updated_at FROM products ORDER BY name ASC;'
    );
    return res.rows.map((p) => ({
      id: p.id,
      name: p.name,
      default_price: p.default_price ? parseFloat(p.default_price) : null,
      is_active: p.is_active,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));
  }

  static async getProduct(id) {
    const res = await pool.query('SELECT * FROM products WHERE id = $1;', [id]);
    if (res.rows.length === 0) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }
    const p = res.rows[0];
    return {
      id: p.id,
      name: p.name,
      default_price: p.default_price ? parseFloat(p.default_price) : null,
      is_active: p.is_active,
      created_at: p.created_at,
      updated_at: p.updated_at,
    };
  }

  static async createProduct(data, userEmail) {
    const { name, default_price, is_active = true } = data;

    // Check unique name
    const existing = await pool.query('SELECT id FROM products WHERE LOWER(name) = LOWER($1);', [name.trim()]);
    if (existing.rows.length > 0) {
      throw new AppError('A product with this name already exists', 400, 'DUPLICATE_NAME');
    }

    const res = await pool.query(
      `INSERT INTO products (name, default_price, is_active)
       VALUES ($1, $2, $3)
       RETURNING *;`,
      [name.trim(), default_price ?? null, is_active]
    );

    const product = res.rows[0];

    await recordAudit({
      userEmail,
      action: 'create',
      entity: 'product',
      entityId: product.id,
      before: null,
      after: product,
    });

    return {
      id: product.id,
      name: product.name,
      default_price: product.default_price ? parseFloat(product.default_price) : null,
      is_active: product.is_active,
      created_at: product.created_at,
      updated_at: product.updated_at,
    };
  }

  static async updateProduct(id, data, userEmail) {
    const existing = await pool.query('SELECT * FROM products WHERE id = $1;', [id]);
    if (existing.rows.length === 0) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }
    const current = existing.rows[0];

    // Check unique name if name is changed
    if (data.name && data.name.trim().toLowerCase() !== current.name.toLowerCase()) {
      const dup = await pool.query(
        'SELECT id FROM products WHERE LOWER(name) = LOWER($1) AND id != $2;',
        [data.name.trim(), id]
      );
      if (dup.rows.length > 0) {
        throw new AppError('Another product with this name already exists', 400, 'DUPLICATE_NAME');
      }
    }

    const updatedName = data.name !== undefined ? data.name.trim() : current.name;
    const updatedPrice = data.default_price !== undefined ? data.default_price : current.default_price;
    const updatedActive = data.is_active !== undefined ? data.is_active : current.is_active;

    const res = await pool.query(
      `UPDATE products
       SET name = $1, default_price = $2, is_active = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *;`,
      [updatedName, updatedPrice, updatedActive, id]
    );

    const updated = res.rows[0];

    await recordAudit({
      userEmail,
      action: 'update',
      entity: 'product',
      entityId: id,
      before: current,
      after: updated,
    });

    return {
      id: updated.id,
      name: updated.name,
      default_price: updated.default_price ? parseFloat(updated.default_price) : null,
      is_active: updated.is_active,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }
}

export default ProductsService;
