import { pool } from '../db/index.js';
import { getDefaultDateRange } from './sales.service.js';

function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvString(headers, rows) {
  const headerLine = headers.map(escapeCsv).join(',');
  const rowLines = rows.map((row) => row.map(escapeCsv).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

export class ExportService {
  /**
   * Export sales to CSV format
   */
  static async exportSalesCsv({ from, to }) {
    const range = getDefaultDateRange();
    const fromDate = from || range.from;
    const toDate = to || range.to;

    const res = await pool.query(
      `SELECT
        s.id,
        TO_CHAR(s.sale_date, 'YYYY-MM-DD') AS sale_date,
        s.timestamp,
        p.name AS product_name,
        s.quantity,
        s.price_per_item,
        s.total_amount,
        s.payment_method,
        m.name AS received_by_name,
        s.notes,
        s.import_row_ref
      FROM sales s
      JOIN products p ON s.product_id = p.id
      JOIN members m ON s.received_by = m.id
      WHERE s.deleted_at IS NULL
        AND s.sale_date >= $1 AND s.sale_date <= $2
      ORDER BY s.sale_date ASC, s.timestamp ASC;`,
      [fromDate, toDate]
    );

    const headers = [
      'ID',
      'Sale Date',
      'Timestamp',
      'Product',
      'Quantity',
      'Price Per Item',
      'Total Amount Received',
      'Payment Method',
      'Received By',
      'Notes',
      'Import Ref',
    ];

    const rows = res.rows.map((r) => [
      r.id,
      r.sale_date,
      r.timestamp ? new Date(r.timestamp).toISOString() : '',
      r.product_name,
      r.quantity,
      r.price_per_item !== null ? parseFloat(r.price_per_item).toFixed(2) : '',
      parseFloat(r.total_amount).toFixed(2),
      r.payment_method,
      r.received_by_name,
      r.notes || '',
      r.import_row_ref || '',
    ]);

    return {
      filename: `sales_${fromDate}_to_${toDate}.csv`,
      csv: toCsvString(headers, rows),
      rowCount: rows.length,
      fromDate,
      toDate,
    };
  }

  /**
   * Export expenses to CSV format
   */
  static async exportExpensesCsv({ from, to }) {
    const range = getDefaultDateRange();
    const fromDate = from || range.from;
    const toDate = to || range.to;

    const res = await pool.query(
      `SELECT
        e.id,
        TO_CHAR(e.expense_date, 'YYYY-MM-DD') AS expense_date,
        e.timestamp,
        c.name AS category_name,
        e.description,
        e.amount,
        e.payment_method,
        m.name AS paid_by_name,
        e.expense_type,
        e.notes,
        e.import_row_ref
      FROM expenses e
      JOIN expense_categories c ON e.category_id = c.id
      JOIN members m ON e.paid_by = m.id
      WHERE e.deleted_at IS NULL
        AND e.expense_date >= $1 AND e.expense_date <= $2
      ORDER BY e.expense_date ASC, e.timestamp ASC;`,
      [fromDate, toDate]
    );

    const headers = [
      'ID',
      'Expense Date',
      'Timestamp',
      'Category',
      'Description',
      'Amount',
      'Payment Method',
      'Paid By',
      'Expense Type',
      'Notes',
      'Import Ref',
    ];

    const rows = res.rows.map((r) => [
      r.id,
      r.expense_date,
      r.timestamp ? new Date(r.timestamp).toISOString() : '',
      r.category_name,
      r.description,
      parseFloat(r.amount).toFixed(2),
      r.payment_method,
      r.paid_by_name,
      r.expense_type,
      r.notes || '',
      r.import_row_ref || '',
    ]);

    return {
      filename: `expenses_${fromDate}_to_${toDate}.csv`,
      csv: toCsvString(headers, rows),
      rowCount: rows.length,
      fromDate,
      toDate,
    };
  }
}

export default ExportService;
