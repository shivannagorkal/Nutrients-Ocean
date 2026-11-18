import crypto from 'crypto';
import { pool } from '../db/index.js';
import { AppError } from '../utils/appError.js';
import { recordAudit } from './audit.service.js';

// Get current month date range in IST (YYYY-MM-DD)
export function getDefaultDateRange() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();

  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
  };
}

export class SalesService {
  /**
   * Create a new sale
   */
  static async createSale(data, userEmail) {
    const {
      sale_date,
      product_id,
      quantity,
      price_per_item,
      total_amount,
      payment_method,
      received_by,
      notes,
    } = data;

    // Verify product exists
    const prodRes = await pool.query(
      'SELECT id, name, default_price FROM products WHERE id = $1 AND is_active = true;',
      [product_id]
    );
    if (prodRes.rows.length === 0) {
      throw new AppError('Product not found or is inactive', 400, 'PRODUCT_NOT_FOUND');
    }
    const product = prodRes.rows[0];
    const isMixed = product.name.toLowerCase() === 'other';

    // Section 9: "notes required (min 3 chars) when product is “Other”"
    if (isMixed && (!notes || notes.trim().length < 3)) {
      throw new AppError(
        'Notes are required (minimum 3 characters) when product is "Other"',
        400,
        'VALIDATION_ERROR',
        [{ field: 'notes', message: 'Notes must be at least 3 characters when product is Other' }]
      );
    }

    // Verify received_by member exists
    const memberRes = await pool.query('SELECT id, name FROM members WHERE id = $1;', [received_by]);
    if (memberRes.rows.length === 0) {
      throw new AppError('Received by member not found', 400, 'MEMBER_NOT_FOUND');
    }

    const insertQuery = `
      INSERT INTO sales (
        sale_date, product_id, quantity, price_per_item, total_amount,
        payment_method, received_by, notes, is_mixed, source, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'app', $10)
      RETURNING *;
    `;

    const res = await pool.query(insertQuery, [
      sale_date,
      product_id,
      quantity,
      price_per_item !== undefined && price_per_item !== null ? price_per_item : null,
      total_amount,
      payment_method,
      received_by,
      notes ? notes.trim() : null,
      isMixed,
      userEmail,
    ]);

    const createdRecord = res.rows[0];

    // Format money as numbers
    createdRecord.price_per_item = createdRecord.price_per_item ? parseFloat(createdRecord.price_per_item) : null;
    createdRecord.total_amount = parseFloat(createdRecord.total_amount);

    // Audit log
    await recordAudit({
      userEmail,
      action: 'create',
      entity: 'sales',
      entityId: createdRecord.id,
      after: createdRecord,
    });

    return createdRecord;
  }

  /**
   * Create a multi-item sale order
   */
  static async createSaleOrder(data, userEmail) {
    const {
      sale_date,
      payment_method,
      received_by,
      customer_name = null,
      customer_phone = null,
      notes = null,
      items = [],
    } = data;

    if (!items || items.length === 0) {
      throw new AppError('Order must contain at least one item', 400, 'EMPTY_ORDER');
    }

    // Verify received_by member exists
    const memberRes = await pool.query('SELECT id, name FROM members WHERE id = $1;', [received_by]);
    if (memberRes.rows.length === 0) {
      throw new AppError('Received by member not found', 400, 'MEMBER_NOT_FOUND');
    }

    // Fetch and validate all products
    const productIds = items.map((it) => it.product_id);
    const prodRes = await pool.query(
      'SELECT id, name, default_price FROM products WHERE id = ANY($1::uuid[]) AND is_active = true;',
      [productIds]
    );
    const productMap = new Map(prodRes.rows.map((p) => [p.id, p]));

    for (const it of items) {
      const prod = productMap.get(it.product_id);
      if (!prod) {
        throw new AppError(`Product with ID ${it.product_id} not found or is inactive`, 400, 'PRODUCT_NOT_FOUND');
      }
      const isMixed = prod.name.toLowerCase() === 'other';
      const itemNotes = it.notes || notes;
      if (isMixed && (!itemNotes || itemNotes.trim().length < 3)) {
        throw new AppError(
          'Notes are required (minimum 3 characters) when product is "Other"',
          400,
          'VALIDATION_ERROR'
        );
      }
    }

    // Generate shared order_group_id and receipt number
    const orderGroupId = crypto.randomUUID();
    const d = new Date();
    const datePart = d.toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.floor(100 + Math.random() * 900);
    const receiptNumber = `NO-SAL-${datePart}-${rand}`;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertedRecords = [];
      let totalOrderAmount = 0;

      for (const it of items) {
        const prod = productMap.get(it.product_id);
        const isMixed = prod.name.toLowerCase() === 'other';
        const qty = parseInt(it.quantity, 10) || 1;
        const pricePerItem =
          it.price_per_item !== undefined && it.price_per_item !== null
            ? Number(it.price_per_item)
            : Number(prod.default_price);
        const lineTotal =
          it.total_amount !== undefined && it.total_amount !== null
            ? Number(it.total_amount)
            : qty * pricePerItem;

        totalOrderAmount += lineTotal;

        const insertQuery = `
          INSERT INTO sales (
            sale_date, product_id, quantity, price_per_item, total_amount,
            payment_method, received_by, notes, is_mixed, source, created_by,
            order_group_id, receipt_number, customer_name, customer_phone
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'app', $10, $11, $12, $13, $14)
          RETURNING *;
        `;

        const res = await client.query(insertQuery, [
          sale_date,
          it.product_id,
          qty,
          pricePerItem,
          lineTotal,
          payment_method,
          received_by,
          it.notes ? it.notes.trim() : (notes ? notes.trim() : null),
          isMixed,
          userEmail,
          orderGroupId,
          receiptNumber,
          customer_name ? customer_name.trim() : null,
          customer_phone ? customer_phone.trim() : null,
        ]);

        const record = res.rows[0];
        record.price_per_item = record.price_per_item ? parseFloat(record.price_per_item) : null;
        record.total_amount = parseFloat(record.total_amount);
        insertedRecords.push(record);
      }

      await client.query('COMMIT');

      // Audit log for bulk order
      await recordAudit({
        userEmail,
        action: 'create_order',
        entity: 'sales',
        entityId: orderGroupId,
        after: {
          order_group_id: orderGroupId,
          receipt_number: receiptNumber,
          total_amount: totalOrderAmount,
          items_count: insertedRecords.length,
          customer_name,
          customer_phone,
        },
      });

      return {
        order_group_id: orderGroupId,
        receipt_number: receiptNumber,
        total_amount: totalOrderAmount,
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
   * List paginated sales
   */
  static async listSales(query) {
    const defaultRange = getDefaultDateRange();
    const from = query.from || defaultRange.from;
    const to = query.to || defaultRange.to;
    const page = parseInt(query.page || 1, 10);
    const pageSize = Math.min(parseInt(query.pageSize || 20, 10), 100);
    const offset = (page - 1) * pageSize;

    const conditions = ['s.deleted_at IS NULL', 's.sale_date >= $1', 's.sale_date <= $2'];
    const params = [from, to];
    let paramIdx = 3;

    if (query.product) {
      conditions.push(`s.product_id = $${paramIdx++}`);
      params.push(query.product);
    }
    if (query.payment) {
      conditions.push(`s.payment_method = $${paramIdx++}`);
      params.push(query.payment);
    }
    if (query.member) {
      conditions.push(`s.received_by = $${paramIdx++}`);
      params.push(query.member);
    }
    if (query.q) {
      conditions.push(`s.notes ILIKE $${paramIdx++}`);
      params.push(`%${query.q.trim()}%`);
    }

    // Whitelist sort column
    const sortFieldMap = {
      sale_date: 's.sale_date',
      created_at: 's.created_at',
      total_amount: 's.total_amount',
      quantity: 's.quantity',
    };
    let sortClause = 's.sale_date DESC, s.created_at DESC';
    if (query.sort) {
      const parts = query.sort.split(':');
      const col = parts[0];
      const dir = parts[1]?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      if (sortFieldMap[col]) {
        sortClause = `${sortFieldMap[col]} ${dir}`;
      }
    }

    const whereClause = conditions.join(' AND ');

    // Count total rows
    const countRes = await pool.query(
      `SELECT COUNT(*)::int as total FROM sales s WHERE ${whereClause};`,
      params
    );
    const total = countRes.rows[0].total;

    // Fetch records with joined product and member names
    const dataQuery = `
      SELECT 
        s.id, s.timestamp, s.sale_date, s.product_id, s.quantity, 
        s.price_per_item, s.total_amount, s.payment_method, s.received_by,
        s.notes, s.is_mixed, s.source, s.created_by, s.created_at, s.updated_at,
        p.name as product_name,
        m.name as received_by_name
      FROM sales s
      JOIN products p ON s.product_id = p.id
      JOIN members m ON s.received_by = m.id
      WHERE ${whereClause}
      ORDER BY ${sortClause}
      LIMIT $${paramIdx++} OFFSET $${paramIdx++};
    `;

    const dataRes = await pool.query(dataQuery, [...params, pageSize, offset]);

    const records = dataRes.rows.map((r) => ({
      ...r,
      price_per_item: r.price_per_item ? parseFloat(r.price_per_item) : null,
      total_amount: parseFloat(r.total_amount),
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
   * Get a single sale by ID
   */
  static async getSale(id) {
    const res = await pool.query(
      `SELECT s.*, p.name as product_name, m.name as received_by_name
       FROM sales s
       JOIN products p ON s.product_id = p.id
       JOIN members m ON s.received_by = m.id
       WHERE s.id = $1 AND s.deleted_at IS NULL;`,
      [id]
    );
    if (res.rows.length === 0) {
      throw new AppError('Sale record not found', 404, 'RECORD_NOT_FOUND');
    }
    const r = res.rows[0];
    return {
      ...r,
      price_per_item: r.price_per_item ? parseFloat(r.price_per_item) : null,
      total_amount: parseFloat(r.total_amount),
    };
  }

  /**
   * Update sale
   */
  static async updateSale(id, data, userEmail) {
    const existing = await this.getSale(id);

    // If product changed, verify and check notes rule
    let isMixed = existing.is_mixed;
    if (data.product_id && data.product_id !== existing.product_id) {
      const prodRes = await pool.query(
        'SELECT id, name FROM products WHERE id = $1 AND is_active = true;',
        [data.product_id]
      );
      if (prodRes.rows.length === 0) {
        throw new AppError('Product not found or is inactive', 400, 'PRODUCT_NOT_FOUND');
      }
      isMixed = prodRes.rows[0].name.toLowerCase() === 'other';
    }

    const finalNotes = data.notes !== undefined ? data.notes : existing.notes;
    if (isMixed && (!finalNotes || finalNotes.trim().length < 3)) {
      throw new AppError(
        'Notes are required (minimum 3 characters) when product is "Other"',
        400,
        'VALIDATION_ERROR',
        [{ field: 'notes', message: 'Notes must be at least 3 characters when product is Other' }]
      );
    }

    const updatedSaleDate = data.sale_date ? String(data.sale_date).slice(0, 10) : existing.sale_date;
    const updatedProductId = data.product_id || existing.product_id;
    const updatedQuantity = data.quantity || existing.quantity;
    const updatedPrice = data.price_per_item !== undefined ? data.price_per_item : existing.price_per_item;
    const updatedTotal = data.total_amount || existing.total_amount;
    const updatedPayment = data.payment_method || existing.payment_method;
    const updatedReceivedBy = data.received_by || existing.received_by;

    const updateQuery = `
      UPDATE sales
      SET 
        sale_date = $1,
        product_id = $2,
        quantity = $3,
        price_per_item = $4,
        total_amount = $5,
        payment_method = $6,
        received_by = $7,
        notes = $8,
        is_mixed = $9,
        updated_at = NOW()
      WHERE id = $10 AND deleted_at IS NULL
      RETURNING *;
    `;

    const res = await pool.query(updateQuery, [
      updatedSaleDate,
      updatedProductId,
      updatedQuantity,
      updatedPrice,
      updatedTotal,
      updatedPayment,
      updatedReceivedBy,
      finalNotes ? finalNotes.trim() : null,
      isMixed,
      id,
    ]);

    const updatedRecord = res.rows[0];
    updatedRecord.price_per_item = updatedRecord.price_per_item ? parseFloat(updatedRecord.price_per_item) : null;
    updatedRecord.total_amount = parseFloat(updatedRecord.total_amount);

    await recordAudit({
      userEmail,
      action: 'update',
      entity: 'sales',
      entityId: id,
      before: existing,
      after: updatedRecord,
    });

    return updatedRecord;
  }

  /**
   * Soft delete sale
   */
  static async deleteSale(id, userEmail) {
    const existing = await this.getSale(id);

    await pool.query('UPDATE sales SET deleted_at = NOW() WHERE id = $1;', [id]);

    await recordAudit({
      userEmail,
      action: 'delete',
      entity: 'sales',
      entityId: id,
      before: existing,
    });

    return { ok: true };
  }
}

export default SalesService;
