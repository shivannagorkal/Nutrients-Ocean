import { pool } from '../db/index.js';
import { getTodayISTDateString, generateDateRange } from '../utils/date.js';
import { calculatePaidPersonally, calculateReimbursed, round2 } from './metrics.service.js';

export class DataCheckService {
  /**
   * Run all 11 canonical Data Check rules
   */
  static async runAllChecks() {
    const today = getTodayISTDateString();
    const issues = [];

    // Query sales, expenses, settlements, members, products, categories
    const [salesRes, expensesRes, settlementsRes, membersRes, productsRes, categoriesRes] =
      await Promise.all([
        pool.query(`
          SELECT 
            s.id, s.timestamp, TO_CHAR(s.sale_date, 'YYYY-MM-DD') AS sale_date,
            s.product_id, s.quantity, s.price_per_item, s.total_amount,
            s.payment_method, s.received_by, s.notes, s.is_mixed, s.source,
            s.created_at,
            p.name AS product_name,
            m.name AS received_by_name
          FROM sales s
          LEFT JOIN products p ON s.product_id = p.id
          LEFT JOIN members m ON s.received_by = m.id
          WHERE s.deleted_at IS NULL
          ORDER BY s.sale_date ASC, s.timestamp ASC;
        `),
        pool.query(`
          SELECT 
            e.id, e.timestamp, TO_CHAR(e.expense_date, 'YYYY-MM-DD') AS expense_date,
            e.category_id, e.description, e.amount, e.payment_method,
            e.paid_by, e.expense_type, e.notes, e.source,
            e.created_at,
            c.name AS category_name,
            m.name AS paid_by_name
          FROM expenses e
          LEFT JOIN expense_categories c ON e.category_id = c.id
          LEFT JOIN members m ON e.paid_by = m.id
          WHERE e.deleted_at IS NULL
          ORDER BY e.expense_date ASC, e.timestamp ASC;
        `),
        pool.query(`
          SELECT 
            s.id, TO_CHAR(s.settlement_date, 'YYYY-MM-DD') AS settlement_date,
            s.amount, s.paid_by, s.paid_to, s.notes,
            s.created_at,
            m1.name AS paid_by_name,
            m2.name AS paid_to_name
          FROM settlements s
          LEFT JOIN members m1 ON s.paid_by = m1.id
          LEFT JOIN members m2 ON s.paid_to = m2.id
          WHERE s.deleted_at IS NULL
          ORDER BY s.settlement_date ASC, s.created_at ASC;
        `),
        pool.query('SELECT id, name FROM members ORDER BY name;'),
        pool.query('SELECT id, name FROM products;'),
        pool.query('SELECT id, name FROM expense_categories;'),
      ]);

    const sales = salesRes.rows;
    const expenses = expensesRes.rows;
    const settlements = settlementsRes.rows;
    const members = membersRes.rows;

    // =========================================================================
    // Rule 1 (Error): A member is Overpaid (Reimbursed > Paid personally)
    // =========================================================================
    const regularExpenses = expenses.filter((e) => e.expense_type === 'Regular Business Expense');
    const paidPersonallyMap = calculatePaidPersonally(regularExpenses);
    const reimbursedMap = calculateReimbursed(settlements);

    for (const m of members) {
      const paidPersonally = paidPersonallyMap[m.id] || 0;
      const reimbursed = reimbursedMap[m.id] || 0;
      if (reimbursed > paidPersonally) {
        const overpaidAmt = round2(reimbursed - paidPersonally);
        issues.push({
          id: `overpaid-${m.id}`,
          severity: 'error',
          rule: 'Overpaid Partner',
          message: `${m.name} is overpaid by ₹${overpaidAmt.toFixed(2)} (Reimbursed: ₹${reimbursed.toFixed(2)}, Paid personally: ₹${paidPersonally.toFixed(2)})`,
          entity: 'member',
          entityId: m.id,
          details: {
            memberName: m.name,
            paidPersonally,
            reimbursed,
            overpaidAmount: overpaidAmt,
          },
        });
      }
    }

    // =========================================================================
    // Rule 2 (Error): Amount <= 0, missing required field, or unknown reference
    // =========================================================================
    for (const s of sales) {
      const amt = parseFloat(s.total_amount);
      if (isNaN(amt) || amt <= 0) {
        issues.push({
          id: `sale-amount-invalid-${s.id}`,
          severity: 'error',
          rule: 'Invalid Amount',
          message: `Sale total amount is ₹${s.total_amount || 0} (must be > 0)`,
          entity: 'sale',
          entityId: s.id,
          record: s,
        });
      }
      if (!s.product_name) {
        issues.push({
          id: `sale-product-unknown-${s.id}`,
          severity: 'error',
          rule: 'Unknown Product Reference',
          message: `Sale links to unknown or missing product ID: ${s.product_id}`,
          entity: 'sale',
          entityId: s.id,
          record: s,
        });
      }
      if (!s.received_by_name) {
        issues.push({
          id: `sale-member-unknown-${s.id}`,
          severity: 'error',
          rule: 'Unknown Partner Reference',
          message: `Sale links to unknown or missing received_by member ID: ${s.received_by}`,
          entity: 'sale',
          entityId: s.id,
          record: s,
        });
      }
    }

    for (const e of expenses) {
      const amt = parseFloat(e.amount);
      if (isNaN(amt) || amt <= 0) {
        issues.push({
          id: `expense-amount-invalid-${e.id}`,
          severity: 'error',
          rule: 'Invalid Amount',
          message: `Expense amount is ₹${e.amount || 0} (must be > 0)`,
          entity: 'expense',
          entityId: e.id,
          record: e,
        });
      }
      if (!e.category_name) {
        issues.push({
          id: `expense-category-unknown-${e.id}`,
          severity: 'error',
          rule: 'Unknown Category Reference',
          message: `Expense links to unknown or missing category ID: ${e.category_id}`,
          entity: 'expense',
          entityId: e.id,
          record: e,
        });
      }
      if (!e.paid_by_name) {
        issues.push({
          id: `expense-member-unknown-${e.id}`,
          severity: 'error',
          rule: 'Unknown Partner Reference',
          message: `Expense links to unknown or missing paid_by member ID: ${e.paid_by}`,
          entity: 'expense',
          entityId: e.id,
          record: e,
        });
      }
    }

    for (const st of settlements) {
      const amt = parseFloat(st.amount);
      if (isNaN(amt) || amt <= 0) {
        issues.push({
          id: `settlement-amount-invalid-${st.id}`,
          severity: 'error',
          rule: 'Invalid Amount',
          message: `Settlement amount is ₹${st.amount || 0} (must be > 0)`,
          entity: 'settlement',
          entityId: st.id,
          record: st,
        });
      }
    }

    // =========================================================================
    // Rule 3 (Error): Date in the future
    // =========================================================================
    for (const s of sales) {
      if (s.sale_date > today) {
        issues.push({
          id: `sale-future-date-${s.id}`,
          severity: 'error',
          rule: 'Future Date',
          message: `Sale has a future date (${s.sale_date} is after today ${today})`,
          entity: 'sale',
          entityId: s.id,
          record: s,
        });
      }
    }

    for (const e of expenses) {
      if (e.expense_date > today) {
        issues.push({
          id: `expense-future-date-${e.id}`,
          severity: 'error',
          rule: 'Future Date',
          message: `Expense has a future date (${e.expense_date} is after today ${today})`,
          entity: 'expense',
          entityId: e.id,
          record: e,
        });
      }
    }

    for (const st of settlements) {
      if (st.settlement_date > today) {
        issues.push({
          id: `settlement-future-date-${st.id}`,
          severity: 'error',
          rule: 'Future Date',
          message: `Settlement has a future date (${st.settlement_date} is after today ${today})`,
          entity: 'settlement',
          entityId: st.id,
          record: st,
        });
      }
    }

    // =========================================================================
    // Rule 4 (Warning): Possible duplicate (same date, member, amount, type within 10 min)
    // =========================================================================
    for (let i = 0; i < expenses.length; i++) {
      for (let j = i + 1; j < expenses.length; j++) {
        const e1 = expenses[i];
        const e2 = expenses[j];

        if (
          e1.expense_date === e2.expense_date &&
          e1.paid_by === e2.paid_by &&
          parseFloat(e1.amount) === parseFloat(e2.amount) &&
          e1.expense_type === e2.expense_type
        ) {
          // Check timestamp within 10 minutes (600,000 ms)
          const t1 = e1.timestamp ? new Date(e1.timestamp).getTime() : 0;
          const t2 = e2.timestamp ? new Date(e2.timestamp).getTime() : 0;
          const diffMs = Math.abs(t1 - t2);

          if (diffMs <= 600000) {
            issues.push({
              id: `expense-duplicate-${e1.id}-${e2.id}`,
              severity: 'warning',
              rule: 'Possible Duplicate Entry',
              message: `Possible duplicate expense: two ${e1.expense_type} entries of ₹${e1.amount} by ${e1.paid_by_name} on ${e1.expense_date} within ${Math.round(diffMs / 1000)}s`,
              entity: 'expense',
              entityId: e2.id,
              record: e2,
              details: { firstId: e1.id, secondId: e2.id, amount: e1.amount },
            });
          }
        }
      }
    }

    // =========================================================================
    // Rule 5 (Warning): Sale quantity > 1 but price per item equals total
    // =========================================================================
    for (const s of sales) {
      const qty = parseInt(s.quantity, 10) || 0;
      const price = parseFloat(s.price_per_item);
      const total = parseFloat(s.total_amount);

      if (qty > 1 && !isNaN(price) && !isNaN(total) && Math.abs(price - total) < 0.01) {
        issues.push({
          id: `sale-unit-price-equals-total-${s.id}`,
          severity: 'warning',
          rule: 'Price Column Equals Total',
          message: `Sale of ${s.product_name}: Quantity is ${qty} but price per item (₹${price}) equals total amount (₹${total}) instead of unit price`,
          entity: 'sale',
          entityId: s.id,
          record: s,
        });
      }
    }

    // =========================================================================
    // Rule 6 (Warning): Sale total differs from quantity * price by > ₹10
    // =========================================================================
    for (const s of sales) {
      if (!s.is_mixed && s.product_name !== 'Other') {
        const qty = parseInt(s.quantity, 10) || 0;
        const price = parseFloat(s.price_per_item);
        const total = parseFloat(s.total_amount);

        if (qty > 0 && !isNaN(price) && price > 0 && !isNaN(total)) {
          const expected = round2(qty * price);
          const diff = round2(Math.abs(total - expected));

          if (diff > 10) {
            issues.push({
              id: `sale-total-differs-expected-${s.id}`,
              severity: 'warning',
              rule: 'Total Differs from Qty × Price',
              message: `Sale total (₹${total}) differs from quantity × price (${qty} × ₹${price} = ₹${expected}) by ₹${diff.toFixed(2)}`,
              entity: 'sale',
              entityId: s.id,
              record: s,
            });
          }
        }
      }
    }

    // =========================================================================
    // Rule 7 (Warning): "Other" product without notes
    // =========================================================================
    for (const s of sales) {
      if (s.is_mixed || s.product_name === 'Other') {
        const notesStr = (s.notes || '').trim();
        if (!notesStr) {
          issues.push({
            id: `sale-other-missing-notes-${s.id}`,
            severity: 'warning',
            rule: '"Other" Product Without Notes',
            message: `Sale of "Other" product on ${s.sale_date} (₹${s.total_amount}) has no description in notes`,
            entity: 'sale',
            entityId: s.id,
            record: s,
          });
        }
      }
    }

    // =========================================================================
    // Rule 8 (Warning): Entry date > 3 days before creation time (back-dated)
    // =========================================================================
    for (const e of expenses) {
      if (e.source !== 'import' && e.created_at && e.expense_date) {
        const createdDate = new Date(e.created_at).toISOString().slice(0, 10);
        const [y1, m1, d1] = e.expense_date.split('-').map(Number);
        const [y2, m2, d2] = createdDate.split('-').map(Number);
        const dtEntry = new Date(Date.UTC(y1, m1 - 1, d1));
        const dtCreated = new Date(Date.UTC(y2, m2 - 1, d2));
        const diffDays = Math.round((dtCreated.getTime() - dtEntry.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays > 3) {
          issues.push({
            id: `expense-backdated-${e.id}`,
            severity: 'warning',
            rule: 'Back-dated Entry',
            message: `Expense of ${e.description} dated ${e.expense_date} was entered on ${createdDate} (${diffDays} days later)`,
            entity: 'expense',
            entityId: e.id,
            record: e,
          });
        }
      }
    }

    for (const s of sales) {
      if (s.source !== 'import' && s.created_at && s.sale_date) {
        const createdDate = new Date(s.created_at).toISOString().slice(0, 10);
        const [y1, m1, d1] = s.sale_date.split('-').map(Number);
        const [y2, m2, d2] = createdDate.split('-').map(Number);
        const dtEntry = new Date(Date.UTC(y1, m1 - 1, d1));
        const dtCreated = new Date(Date.UTC(y2, m2 - 1, d2));
        const diffDays = Math.round((dtCreated.getTime() - dtEntry.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays > 3) {
          issues.push({
            id: `sale-backdated-${s.id}`,
            severity: 'warning',
            rule: 'Back-dated Entry',
            message: `Sale of ${s.product_name} dated ${s.sale_date} was entered on ${createdDate} (${diffDays} days later)`,
            entity: 'sale',
            entityId: s.id,
            record: s,
          });
        }
      }
    }

    // =========================================================================
    // Rule 9 (Warning): Initial Investment paid by method other than Personal Payment
    // =========================================================================
    for (const e of expenses) {
      if (e.expense_type === 'Initial Investment' && e.payment_method !== 'Personal Payment') {
        issues.push({
          id: `investment-payment-method-${e.id}`,
          severity: 'warning',
          rule: 'Investment Payment Method',
          message: `Initial Investment of ₹${e.amount} (${e.description}) was paid via ${e.payment_method} instead of Personal Payment`,
          entity: 'expense',
          entityId: e.id,
          record: e,
        });
      }
    }

    // =========================================================================
    // Rule 10 (Info): Notes mention settlement words without matching Settlement
    // =========================================================================
    const settlementKeywords = ['paid to', 'repaid', 'reimburse', 'settled', 'settlement'];
    for (const e of expenses) {
      const text = `${e.description || ''} ${e.notes || ''}`.toLowerCase();
      const matchedWord = settlementKeywords.find((kw) => text.includes(kw));

      if (matchedWord) {
        const hasMatchingSettlement = settlements.some(
          (st) =>
            st.settlement_date === e.expense_date ||
            Math.abs(parseFloat(st.amount) - parseFloat(e.amount)) < 0.01
        );

        if (!hasMatchingSettlement) {
          issues.push({
            id: `expense-settlement-keyword-${e.id}`,
            severity: 'info',
            rule: 'Settlement Keyword Without Settlement',
            message: `Expense text mentions "${matchedWord}" but no corresponding Settlement record exists for this date/amount`,
            entity: 'expense',
            entityId: e.id,
            record: e,
          });
        }
      }
    }

    // =========================================================================
    // Rule 11 (Info): Days with no sales between first and last sale date
    // =========================================================================
    if (sales.length > 0) {
      const minDate = sales[0].sale_date;
      const maxDate = sales[sales.length - 1].sale_date;

      const salesDateSet = new Set(sales.map((s) => s.sale_date));
      const allDates = generateDateRange(minDate, maxDate);

      for (const d of allDates) {
        if (!salesDateSet.has(d)) {
          issues.push({
            id: `no-sales-gap-${d}`,
            severity: 'info',
            rule: 'Day with No Sales',
            message: `Zero sales recorded on ${d} (between operating dates ${minDate} and ${maxDate})`,
            entity: 'system',
            details: { date: d, minDate, maxDate },
          });
        }
      }
    }

    // Summarize counts
    const summary = {
      total: issues.length,
      errors: issues.filter((i) => i.severity === 'error').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
      info: issues.filter((i) => i.severity === 'info').length,
    };

    return {
      summary,
      issues,
    };
  }
}

export default DataCheckService;
