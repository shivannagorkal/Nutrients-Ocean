import { pool } from '../db/index.js';

/**
 * Record an audit log entry in PostgreSQL
 * @param {Object} entry
 * @param {string} entry.userEmail - Email of the user performing the action
 * @param {'login'|'logout'|'create'|'update'|'delete'} entry.action - Action type
 * @param {string} entry.entity - Entity name (e.g., 'sales', 'expenses', 'settlements', 'auth')
 * @param {string} [entry.entityId] - ID of the affected entity
 * @param {Object} [entry.before] - Snapshot before change (for update/delete)
 * @param {Object} [entry.after] - Snapshot after change (for create/update)
 */
export async function recordAudit({
  userEmail,
  action,
  entity,
  entityId = null,
  before = null,
  after = null,
}) {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_email, action, entity, entity_id, before, after, at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        userEmail || 'anonymous',
        action,
        entity,
        entityId ? String(entityId) : null,
        before ? JSON.stringify(before) : null,
        after ? JSON.stringify(after) : null,
      ]
    );
  } catch (err) {
    // Audit logging should not crash the main transaction, but must log error to server
    console.error('Audit Log Error:', err.message);
  }
}

export default { recordAudit };
