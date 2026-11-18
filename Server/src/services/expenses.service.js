import crypto from 'crypto';
import { pool } from '../db/index.js';
import { AppError } from '../utils/appError.js';
import { recordAudit } from './audit.service.js';
import { getDefaultDateRange } from './sales.service.js';

export class ExpensesService {
  /**
   * Create a new expense or initial investment
   */
  static async createExpense(data, userEmail) {
    const {
      expense_date,
      category_id,
      description,
      amount,
      payment_method,
      paid_by,
      expense_type,
      notes,
    } = data;

    // Verify category exists
    const catRes = await pool.query('SELECT id, name FROM expense_categories WHERE id = $1;', [category_id]);
    if (catRes.rows.length === 0) {
      throw new AppError('Expense category not found', 400, 'CATEGORY_NOT_FOUND');
    }

    // Verify paid_by member exists
    const memRes = await pool.query('SELECT id, name FROM members WHERE id = $1;', [paid_by]);
    if (memRes.rows.length === 0) {
      throw new AppError('Paid by member not found', 400, 'MEMBER_NOT_FOUND');
    }

    const insertQuery = `
      INSERT INTO expenses (
        expense_date, category_id, description, amount, payment_method,
        paid_by, expense_type, notes, source, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'app', $9)
      RETURNING *;
    `;

    const res = await pool.query(insertQuery, [
      expense_date,
      category_id,
      description.trim(),
      amount,
      payment_method,
      paid_by,
      expense_type,
      notes ? notes.trim() : null,
      userEmail,
    ]);

    const createdRecord = res.rows[0];
    createdRecord.amount = parseFloat(createdRecord.amount);

    await recordAudit({
      userEmail,
      action: 'create',
      entity: 'expenses',
      entityId: createdRecord.id,
      after: createdRecord,
    });

    return createdRecord;
  }

  /**
   * Create a multi-item expense bill
   */
  static async createExpenseBill(data, userEmail) {
    const {
      expense_date,
      expense_type,
      payment_method,
      paid_by,
      notes = null,
      items = [],
    } = data;

    if (!items || items.length === 0) {
      throw new AppError('Bill must contain at least one expense line', 400, 'EMPTY_EXPENSE_BILL');
    }

    // Verify paid_by member exists
    const memRes = await pool.query('SELECT id, name FROM members WHERE id = $1;', [paid_by]);
    if (memRes.rows.length === 0) {
      throw new AppError('Paid by member not found', 400, 'MEMBER_NOT_FOUND');
    }

    // Verify categories exist
    const categoryIds = items.map((it) => it.category_id);
    const catRes = await pool.query(
      'SELECT id, name FROM expense_categories WHERE id = ANY($1::uuid[]);',
      [categoryIds]
    );
    const categoryMap = new Map(catRes.rows.map((c) => [c.id, c]));

    for (const it of items) {
      if (!categoryMap.has(it.category_id)) {
        throw new AppError(`Category with ID ${it.category_id} not found`, 400, 'CATEGORY_NOT_FOUND');
      }
    }

    const expenseGroupId = crypto.randomUUID();
    const d = new Date();
    const datePart = d.toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.floor(100 + Math.random() * 900);
    const receiptNumber = `NO-EXP-${datePart}-${rand}`;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertedRecords = [];
      let totalBillAmount = 0;

      for (const it of items) {
        const amt = parseFloat(it.amount);
        totalBillAmount += amt;

        const insertQuery = `
          INSERT INTO expenses (
            expense_date, category_id, description, amount, payment_method,
            paid_by, expense_type, notes, source, created_by,
            expense_group_id, receipt_number
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'app', $9, $10, $11)
          RETURNING *;
        `;

        const res = await client.query(insertQuery, [
          expense_date,
          it.category_id,
          it.description.trim(),
          amt,
          payment_method,
          paid_by,
          expense_type,
          it.notes ? it.notes.trim() : (notes ? notes.trim() : null),
          userEmail,
          expenseGroupId,
          receiptNumber,
        ]);

        const record = res.rows[0];
        record.amount = parseFloat(record.amount);
        insertedRecords.push(record);
      }

      await client.query('COMMIT');

      await recordAudit({
        userEmail,
        action: 'create_bill',
        entity: 'expenses',
        entityId: expenseGroupId,
        after: {
          expense_group_id: expenseGroupId,
          receipt_number: receiptNumber,
          total_amount: totalBillAmount,
          items_count: insertedRecords.length,
        },
      });

      return {
        expense_group_id: expenseGroupId,
        receipt_number: receiptNumber,
        total_amount: totalBillAmount,
        items_count: insertedRecords.length,
        records: insertedRecords,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * List paginated expenses
   */
  static async listExpenses(query) {
    const defaultRange = getDefaultDateRange();
    const from = query.from || defaultRange.from;
    const to = query.to || defaultRange.to;
    const page = parseInt(query.page || 1, 10);
    const pageSize = Math.min(parseInt(query.pageSize || 20, 10), 100);
    const offset = (page - 1) * pageSize;

    const conditions = ['e.deleted_at IS NULL', 'e.expense_date >= $1', 'e.expense_date <= $2'];
    const params = [from, to];
    let paramIdx = 3;

    if (query.category) {
      conditions.push(`e.category_id = $${paramIdx++}`);
      params.push(query.category);
    }
    if (query.type) {
      conditions.push(`e.expense_type = $${paramIdx++}`);
      params.push(query.type);
    }
    if (query.payment) {
      conditions.push(`e.payment_method = $${paramIdx++}`);
      params.push(query.payment);
    }
    if (query.member) {
      conditions.push(`e.paid_by = $${paramIdx++}`);
      params.push(query.member);
    }
    if (query.q) {
      conditions.push(`(e.description ILIKE $${paramIdx} OR e.notes ILIKE $${paramIdx})`);
      paramIdx++;
      params.push(`%${query.q.trim()}%`);
    }

    // Whitelist sort
    const sortFieldMap = {
      expense_date: 'e.expense_date',
      created_at: 'e.created_at',
      amount: 'e.amount',
    };
    let sortClause = 'e.expense_date DESC, e.created_at DESC';
    if (query.sort) {
      const parts = query.sort.split(':');
      const col = parts[0];
      const dir = parts[1]?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      if (sortFieldMap[col]) {
        sortClause = `${sortFieldMap[col]} ${dir}`;
      }
    }

    const whereClause = conditions.join(' AND ');

    // Total count
    const countRes = await pool.query(
      `SELECT COUNT(*)::int as total FROM expenses e WHERE ${whereClause};`,
      params
    );
    const total = countRes.rows[0].total;

    // Data query
    const dataQuery = `
      SELECT 
        e.id, e.timestamp, e.expense_date, e.category_id, e.description,
        e.amount, e.payment_method, e.paid_by, e.expense_type, e.notes,
        e.source, e.created_by, e.created_at, e.updated_at,
        c.name as category_name,
        m.name as paid_by_name
      FROM expenses e
      JOIN expense_categories c ON e.category_id = c.id
      JOIN members m ON e.paid_by = m.id
      WHERE ${whereClause}
      ORDER BY ${sortClause}
      LIMIT $${paramIdx++} OFFSET $${paramIdx++};
    `;

    const dataRes = await pool.query(dataQuery, [...params, pageSize, offset]);

    const records = dataRes.rows.map((r) => ({
      ...r,
      amount: parseFloat(r.amount),
    }));

    return {
      records,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * Get single expense
   */
  static async getExpense(id) {
    const res = await pool.query(
      `SELECT e.*, c.name as category_name, m.name as paid_by_name
       FROM expenses e
       JOIN expense_categories c ON e.category_id = c.id
       JOIN members m ON e.paid_by = m.id
       WHERE e.id = $1 AND e.deleted_at IS NULL;`,
      [id]
    );
    if (res.rows.length === 0) {
      throw new AppError('Expense record not found', 404, 'RECORD_NOT_FOUND');
    }
    const r = res.rows[0];
    return {
      ...r,
      amount: parseFloat(r.amount),
    };
  }

  /**
   * Update expense
   */
  static async updateExpense(id, data, userEmail) {
    const existing = await this.getExpense(id);

    if (data.category_id && data.category_id !== existing.category_id) {
      const catRes = await pool.query('SELECT id FROM expense_categories WHERE id = $1;', [data.category_id]);
      if (catRes.rows.length === 0) {
        throw new AppError('Expense category not found', 400, 'CATEGORY_NOT_FOUND');
      }
    }

    if (data.paid_by && data.paid_by !== existing.paid_by) {
      const memRes = await pool.query('SELECT id FROM members WHERE id = $1;', [data.paid_by]);
      if (memRes.rows.length === 0) {
        throw new AppError('Paid by member not found', 400, 'MEMBER_NOT_FOUND');
      }
    }

    const updatedDate = data.expense_date ? String(data.expense_date).slice(0, 10) : existing.expense_date;
    const updatedCategory = data.category_id || existing.category_id;
    const updatedDesc = data.description ? data.description.trim() : existing.description;
    const updatedAmount = data.amount !== undefined ? data.amount : existing.amount;
    const updatedPayment = data.payment_method || existing.payment_method;
    const updatedPaidBy = data.paid_by || existing.paid_by;
    const updatedType = data.expense_type || existing.expense_type;
    const updatedNotes = data.notes !== undefined ? (data.notes ? data.notes.trim() : null) : existing.notes;

    const updateQuery = `
      UPDATE expenses
      SET
        expense_date = $1,
        category_id = $2,
        description = $3,
        amount = $4,
        payment_method = $5,
        paid_by = $6,
        expense_type = $7,
        notes = $8,
        updated_at = NOW()
      WHERE id = $9 AND deleted_at IS NULL
      RETURNING *;
    `;

    const res = await pool.query(updateQuery, [
      updatedDate,
      updatedCategory,
      updatedDesc,
      updatedAmount,
      updatedPayment,
      updatedPaidBy,
      updatedType,
      updatedNotes,
      id,
    ]);

    const updatedRecord = res.rows[0];
    updatedRecord.amount = parseFloat(updatedRecord.amount);

    await recordAudit({
      userEmail,
      action: 'update',
      entity: 'expenses',
      entityId: id,
      before: existing,
      after: updatedRecord,
    });

    return updatedRecord;
  }

  /**
   * Soft delete expense
   */
  static async deleteExpense(id, userEmail) {
    const existing = await this.getExpense(id);

    await pool.query('UPDATE expenses SET deleted_at = NOW() WHERE id = $1;', [id]);

    await recordAudit({
      userEmail,
      action: 'delete',
      entity: 'expenses',
      entityId: id,
      before: existing,
    });

    return { ok: true };
  }
}

export default ExpensesService;
