import { pool } from '../db/index.js';
import {
  round2,
  calculateSales,
  calculateExpenses,
  calculateInvestment,
  calculatePaybackProgress,
  calculatePaidPersonally,
  calculateReimbursed,
  calculateStillOwed,
  calculateEstimatedRevenueBalance,
} from './metrics.service.js';

export class PartnersService {
  static async getPartnersDashboard() {
    // 1. Query all active members
    const membersRes = await pool.query('SELECT id, name, email FROM members ORDER BY name ASC;');
    const members = membersRes.rows;

    // 2. Query all active sales (for all-time sales total)
    const salesRes = await pool.query(
      'SELECT total_amount FROM sales WHERE deleted_at IS NULL;'
    );
    const totalSales = calculateSales(salesRes.rows);

    // 3. Query all active expenses
    const expensesRes = await pool.query(`
      SELECT 
        e.id, TO_CHAR(e.expense_date, 'YYYY-MM-DD') AS expense_date, 
        e.amount, e.payment_method, e.paid_by, e.expense_type,
        m.name AS paid_by_name
      FROM expenses e
      LEFT JOIN members m ON e.paid_by = m.id
      WHERE e.deleted_at IS NULL;
    `);

    // 4. Query all active settlements
    const settlementsRes = await pool.query(`
      SELECT 
        s.id, TO_CHAR(s.settlement_date, 'YYYY-MM-DD') AS settlement_date,
        s.amount, s.paid_by, s.paid_to, s.notes,
        m1.name AS paid_by_name,
        m2.name AS paid_to_name
      FROM settlements s
      LEFT JOIN members m1 ON s.paid_by = m1.id
      LEFT JOIN members m2 ON s.paid_to = m2.id
      WHERE s.deleted_at IS NULL
      ORDER BY s.settlement_date DESC, s.created_at DESC;
    `);

    // Calculate all-time Regular Expenses and Initial Investments
    const regularExpenses = expensesRes.rows.filter(
      (e) => e.expense_type === 'Regular Business Expense'
    );
    const totalExpenses = calculateExpenses(regularExpenses);

    const initialInvestments = expensesRes.rows.filter(
      (e) => e.expense_type === 'Initial Investment'
    );
    const investmentCalc = calculateInvestment(initialInvestments);
    const totalInvestment = investmentCalc.total;

    // Net all time = Total Sales - Total Regular Expenses
    const netAllTime = round2(totalSales - totalExpenses);

    // Payback progress bar: Net (all time) of total Investment
    const payback = calculatePaybackProgress(netAllTime, totalInvestment);

    // Per-member balances
    const paidPersonallyMap = calculatePaidPersonally(regularExpenses);
    const reimbursedMap = calculateReimbursed(settlementsRes.rows);

    // Investment per member (by member ID)
    const investmentByMemberId = {};
    for (const inv of initialInvestments) {
      const amt = parseFloat(inv.amount) || 0;
      investmentByMemberId[inv.paid_by] = round2(
        (investmentByMemberId[inv.paid_by] || 0) + amt
      );
    }

    const partners = members.map((m) => {
      const invested = investmentByMemberId[m.id] || 0;
      const paidPersonally = paidPersonallyMap[m.id] || 0;
      const reimbursed = reimbursedMap[m.id] || 0;
      const stillOwed = calculateStillOwed(paidPersonally, reimbursed);

      return {
        memberId: m.id,
        memberName: m.name,
        invested,
        paidPersonally,
        reimbursed,
        stillOwed,
        isOverpaid: stillOwed < 0,
      };
    });

    // Estimated revenue balance card
    // Formula: Total Sales - regular expenses whose payment method is not Personal Payment - total Reimbursed
    const nonPersonalRegularExpenses = regularExpenses
      .filter((e) => e.payment_method !== 'Personal Payment')
      .reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);

    const totalReimbursed = settlementsRes.rows.reduce(
      (acc, s) => acc + (parseFloat(s.amount) || 0),
      0
    );

    const estimatedBalance = calculateEstimatedRevenueBalance(
      totalSales,
      nonPersonalRegularExpenses,
      totalReimbursed
    );

    const formattedSettlements = settlementsRes.rows.map((s) => ({
      id: s.id,
      settlement_date: s.settlement_date,
      date: s.settlement_date,
      amount: round2(parseFloat(s.amount) || 0),
      paid_by: s.paid_by,
      paidBy: s.paid_by,
      paid_by_name: s.paid_by_name || 'Unknown',
      paidByName: s.paid_by_name || 'Unknown',
      paid_to: s.paid_to,
      paidTo: s.paid_to,
      paid_to_name: s.paid_to_name || 'Unknown',
      paidToName: s.paid_to_name || 'Unknown',
      notes: s.notes,
    }));

    return {
      payback: {
        ...payback,
        netAllTime,
        totalInvestment,
      },
      partners,
      estimatedRevenueBalance: {
        label: 'Estimate',
        totalSales,
        businessPaidExpenses: round2(nonPersonalRegularExpenses),
        totalReimbursed: round2(totalReimbursed),
        estimatedBalance: round2(estimatedBalance),
        note: "All sale money (UPI and cash) is held in Shivanna's account. Label clearly as an estimate.",
      },
      settlements: formattedSettlements,
    };
  }
}

export default PartnersService;
