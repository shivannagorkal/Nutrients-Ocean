import { pool } from '../db/index.js';
import { recordAudit } from './audit.service.js';
import { AppError } from '../utils/appError.js';

export class CategoriesService {
  static async listCategories() {
    const res = await pool.query(
      'SELECT id, name, created_at, updated_at FROM expense_categories ORDER BY name ASC;'
    );
    return res.rows.map((c) => ({
      id: c.id,
      name: c.name,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));
  }

  static async getCategory(id) {
    const res = await pool.query('SELECT * FROM expense_categories WHERE id = $1;', [id]);
    if (res.rows.length === 0) {
      throw new AppError('Expense category not found', 404, 'NOT_FOUND');
    }
    const c = res.rows[0];
    return {
      id: c.id,
      name: c.name,
      created_at: c.created_at,
      updated_at: c.updated_at,
    };
  }

  static async createCategory(data, userEmail) {
    const { name } = data;
    const cleanName = name.trim();

    // Check unique name case-insensitively
    const existing = await pool.query(
      'SELECT id FROM expense_categories WHERE LOWER(name) = LOWER($1);',
      [cleanName]
    );
    if (existing.rows.length > 0) {
      throw new AppError('An expense category with this name already exists', 400, 'DUPLICATE_NAME');
    }

    const res = await pool.query(
      `INSERT INTO expense_categories (name)
       VALUES ($1)
       RETURNING *;`,
      [cleanName]
    );

    const category = res.rows[0];

    await recordAudit({
      userEmail,
      action: 'create',
      entity: 'expense_category',
      entityId: category.id,
      before: null,
      after: category,
    });

    return {
      id: category.id,
      name: category.name,
      created_at: category.created_at,
      updated_at: category.updated_at,
    };
  }

  static async updateCategory(id, data, userEmail) {
    const existing = await pool.query('SELECT * FROM expense_categories WHERE id = $1;', [id]);
    if (existing.rows.length === 0) {
      throw new AppError('Expense category not found', 404, 'NOT_FOUND');
    }
    const current = existing.rows[0];

    const cleanName = data.name.trim();

    if (cleanName.toLowerCase() !== current.name.toLowerCase()) {
      const dup = await pool.query(
        'SELECT id FROM expense_categories WHERE LOWER(name) = LOWER($1) AND id != $2;',
        [cleanName, id]
      );
      if (dup.rows.length > 0) {
        throw new AppError('Another expense category with this name already exists', 400, 'DUPLICATE_NAME');
      }
    }

    const res = await pool.query(
      `UPDATE expense_categories
       SET name = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *;`,
      [cleanName, id]
    );

    const updated = res.rows[0];

    await recordAudit({
      userEmail,
      action: 'update',
      entity: 'expense_category',
      entityId: id,
      before: current,
      after: updated,
    });

    return {
      id: updated.id,
      name: updated.name,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }
}

export default CategoriesService;
