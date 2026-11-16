import { pool } from '../db/index.js';
import { AppError } from '../utils/appError.js';
import { recordAudit } from './audit.service.js';

export class SettlementsService {
  /**
   * Create a new settlement
   */
  static async createSettlement(data, userEmail) {
    const { settlement_date, amount, paid_by, paid_to, notes } = data;

    if (paid_by === paid_to) {
      throw new AppError('Paid By and Paid To cannot be the same member', 400, 'VALIDATION_ERROR', [
        { field: 'paid_to', message: 'Paid By and Paid To cannot be the same member' },
      ]);
    }

    // Verify members exist
    const [byRes, toRes] = await Promise.all([
      pool.query('SELECT id, name FROM members WHERE id = $1;', [paid_by]),
      pool.query('SELECT id, name FROM members WHERE id = $1;', [paid_to]),
    ]);

    if (byRes.rows.length === 0) {
      throw new AppError('Paid by member not found', 400, 'MEMBER_NOT_FOUND');
    }
    if (toRes.rows.length === 0) {
      throw new AppError('Paid to member not found', 400, 'MEMBER_NOT_FOUND');
    }

    const insertQuery = `
      INSERT INTO settlements (settlement_date, amount, paid_by, paid_to, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const res = await pool.query(insertQuery, [
      settlement_date,
      amount,
      paid_by,
      paid_to,
      notes ? notes.trim() : null,
      userEmail,
    ]);

    const createdRecord = res.rows[0];
    createdRecord.amount = parseFloat(createdRecord.amount);

    await recordAudit({
      userEmail,
      action: 'create',
      entity: 'settlements',
      entityId: createdRecord.id,
      after: createdRecord,
    });

    return createdRecord;
  }

  /**
   * List non-deleted settlements
   */
  static async listSettlements() {
    const query = `
      SELECT 
        s.id, s.settlement_date, s.amount, s.paid_by, s.paid_to, s.notes,
        s.created_by, s.created_at, s.updated_at,
        m1.name as paid_by_name,
        m2.name as paid_to_name
      FROM settlements s
      JOIN members m1 ON s.paid_by = m1.id
      JOIN members m2 ON s.paid_to = m2.id
      WHERE s.deleted_at IS NULL
      ORDER BY s.settlement_date DESC, s.created_at DESC;
    `;

    const res = await pool.query(query);

    const records = res.rows.map((r) => ({
      ...r,
      amount: parseFloat(r.amount),
    }));

    return { records };
  }

  /**
   * Get single settlement
   */
  static async getSettlement(id) {
    const query = `
      SELECT 
        s.id, s.settlement_date, s.amount, s.paid_by, s.paid_to, s.notes,
        s.created_by, s.created_at, s.updated_at,
        m1.name as paid_by_name,
        m2.name as paid_to_name
      FROM settlements s
      JOIN members m1 ON s.paid_by = m1.id
      JOIN members m2 ON s.paid_to = m2.id
      WHERE s.id = $1 AND s.deleted_at IS NULL;
    `;

    const res = await pool.query(query, [id]);
    if (res.rows.length === 0) {
      throw new AppError('Settlement record not found', 404, 'RECORD_NOT_FOUND');
    }
    const r = res.rows[0];
    return {
      ...r,
      amount: parseFloat(r.amount),
    };
  }

  /**
   * Update settlement
   */
  static async updateSettlement(id, data, userEmail) {
    const existing = await this.getSettlement(id);

    const paid_by = data.paid_by || existing.paid_by;
    const paid_to = data.paid_to || existing.paid_to;

    if (paid_by === paid_to) {
      throw new AppError('Paid By and Paid To cannot be the same member', 400, 'VALIDATION_ERROR', [
        { field: 'paid_to', message: 'Paid By and Paid To cannot be the same member' },
      ]);
    }

    const updatedDate = data.settlement_date ? String(data.settlement_date).slice(0, 10) : existing.settlement_date;
    const updatedAmount = data.amount !== undefined ? data.amount : existing.amount;
    const updatedNotes = data.notes !== undefined ? (data.notes ? data.notes.trim() : null) : existing.notes;

    const updateQuery = `
      UPDATE settlements
      SET
        settlement_date = $1,
        amount = $2,
        paid_by = $3,
        paid_to = $4,
        notes = $5,
        updated_at = NOW()
      WHERE id = $6 AND deleted_at IS NULL
      RETURNING *;
    `;

    const res = await pool.query(updateQuery, [
      updatedDate,
      updatedAmount,
      paid_by,
      paid_to,
      updatedNotes,
      id,
    ]);

    const updatedRecord = res.rows[0];
    updatedRecord.amount = parseFloat(updatedRecord.amount);

    await recordAudit({
      userEmail,
      action: 'update',
      entity: 'settlements',
      entityId: id,
      before: existing,
      after: updatedRecord,
    });

    return updatedRecord;
  }

  /**
   * Soft delete settlement
   */
  static async deleteSettlement(id, userEmail) {
    const existing = await this.getSettlement(id);

    await pool.query('UPDATE settlements SET deleted_at = NOW() WHERE id = $1;', [id]);

    await recordAudit({
      userEmail,
      action: 'delete',
      entity: 'settlements',
      entityId: id,
      before: existing,
    });

    return { ok: true };
  }
}

export default SettlementsService;
