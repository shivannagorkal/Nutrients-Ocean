import { pool } from '../db/index.js';
import {
  getTodayISTDateString,
  getCurrentMonthStartISTDateString,
  offsetDate,
  generateDateRange,
  getMondayOfWeek,
  formatDateLabel,
  formatWeekLabel,
  formatMonthLabel,
} from '../utils/date.js';

export const NET_NOTE = 'Simple cash view. Ingredients count when bought, not when sold, so early numbers are rough.';

/**
 * Standard monetary rounding to 2 decimal places.
 */
export function round2(val) {
  const n = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(n) || !isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Sales: Sum of total_amount. Money actually received.
 * Never recalculate from quantity * price.
 */
export function calculateSales(salesRows = []) {
  const sum = salesRows.reduce((acc, row) => acc + (parseFloat(row.total_amount) || 0), 0);
  return round2(sum);
}

/**
 * Orders: Count of distinct customer orders.
 * Rows sharing an order_group_id are counted as a single customer order.
 */
export function calculateOrders(salesRows = []) {
  if (!salesRows || salesRows.length === 0) return 0;
  const uniqueOrders = new Set();
  for (const row of salesRows) {
    uniqueOrders.add(row.order_group_id || row.id);
  }
  return uniqueOrders.size;
}

/**
 * Items sold: Sum of quantity.
 */
export function calculateItemsSold(salesRows = []) {
  return salesRows.reduce((acc, row) => acc + (parseInt(row.quantity, 10) || 0), 0);
}

/**
 * Average per order: Sales / Orders (0 if no orders).
 */
export function calculateAveragePerOrder(sales, orders) {
  const s = round2(sales);
  const o = parseInt(orders, 10) || 0;
  if (o <= 0) return 0;
  return round2(s / o);
}

/**
 * Expenses: Sum of amount where expense_type = 'Regular Business Expense'.
 * Never includes Initial Investment.
 */
export function calculateExpenses(expenseRows = []) {
  const sum = expenseRows
    .filter((row) => row.expense_type === 'Regular Business Expense')
    .reduce((acc, row) => acc + (parseFloat(row.amount) || 0), 0);
  return round2(sum);
}

/**
 * Investment: Sum of amount where expense_type = 'Initial Investment',
 * shown per member and in total. Never included in Expenses or Net.
 */
export function calculateInvestment(expenseRows = []) {
  const investments = expenseRows.filter((row) => row.expense_type === 'Initial Investment');
  let total = 0;
  const byMember = {};

  for (const row of investments) {
    const amt = parseFloat(row.amount) || 0;
    total += amt;
    const member = row.paid_by_name || row.paid_by || 'Unknown';
    byMember[member] = round2((byMember[member] || 0) + amt);
  }

  return {
    total: round2(total),
    byMember,
  };
}

/**
 * Net: Sales - Expenses.
 */
export function calculateNet(sales, expenses) {
  return round2(round2(sales) - round2(expenses));
}

/**
 * Payback progress: Net (all time) / total Investment.
 * If Net is negative, the progress is 0.
 */
export function calculatePaybackProgress(netAllTime, totalInvestment) {
  const net = round2(netAllTime);
  const inv = round2(totalInvestment);
  if (inv <= 0 || net <= 0) {
    return {
      ratio: 0,
      percentage: 0,
      netAllTime: net,
      totalInvestment: inv,
    };
  }
  const ratio = net / inv;
  return {
    ratio: Math.min(1, round2(ratio)),
    percentage: Math.min(100, round2(ratio * 100)),
    netAllTime: net,
    totalInvestment: inv,
  };
}

/**
 * Paid personally (per member, all time):
 * Sum of amount where payment_method = 'Personal Payment' and expense_type = 'Regular Business Expense',
 * grouped by paid_by.
 */
export function calculatePaidPersonally(expenseRows = []) {
  const personalExpenses = expenseRows.filter(
    (row) => row.payment_method === 'Personal Payment' && row.expense_type === 'Regular Business Expense'
  );
  const byMember = {};
  for (const row of personalExpenses) {
    const amt = parseFloat(row.amount) || 0;
    const memberId = row.paid_by;
    byMember[memberId] = round2((byMember[memberId] || 0) + amt);
  }
  return byMember;
}

/**
 * Reimbursed (per member, all time):
 * Sum of settlement amount grouped by paid_to.
 */
export function calculateReimbursed(settlementRows = []) {
  const byMember = {};
  for (const row of settlementRows) {
    const amt = parseFloat(row.amount) || 0;
    const memberId = row.paid_to;
    byMember[memberId] = round2((byMember[memberId] || 0) + amt);
  }
  return byMember;
}

/**
 * Still owed (per member): Paid personally - Reimbursed.
 * Below zero indicates Overpaid.
 */
export function calculateStillOwed(paidPersonally, reimbursed) {
  return round2(round2(paidPersonally) - round2(reimbursed));
}

/**
 * Estimated revenue balance (all time):
 * Total Sales - regular expenses whose payment method is NOT Personal Payment - total Reimbursed.
 * All sale money (UPI and cash) is held in Shivanna's account. Label clearly as an estimate.
 */
export function calculateEstimatedRevenueBalance(totalSales, nonPersonalRegularExpenses, totalReimbursed) {
  return round2(round2(totalSales) - round2(nonPersonalRegularExpenses) - round2(totalReimbursed));
}

/**
 * Product breakdown: Group by product: units = sum of quantity, sales = sum of total.
 * Rows where product is 'Other' show as their own row 'Mixed / other orders'.
 */
export function calculateProductBreakdown(salesRows = [], allProducts = []) {
  const productMap = new Map();

  for (const p of allProducts) {
    const isOther = p.name === 'Other';
    productMap.set(p.id, {
      productId: p.id,
      productName: isOther ? 'Mixed / other orders' : p.name,
      units: 0,
      sales: 0,
      isMixed: isOther,
      defaultPrice: p.default_price ? parseFloat(p.default_price) : null,
    });
  }

  for (const row of salesRows) {
    const isOther = row.product_name === 'Other' || row.is_mixed === true;
    const prodId = row.product_id;
    const prodName = isOther ? 'Mixed / other orders' : (row.product_name || 'Unknown');
    const qty = parseInt(row.quantity, 10) || 0;
    const total = parseFloat(row.total_amount) || 0;

    if (!productMap.has(prodId)) {
      productMap.set(prodId, {
        productId: prodId,
        productName: prodName,
        units: 0,
        sales: 0,
        isMixed: isOther,
        defaultPrice: row.price_per_item ? parseFloat(row.price_per_item) : null,
      });
    }

    const current = productMap.get(prodId);
    current.units += qty;
    current.sales = round2(current.sales + total);
  }

  return Array.from(productMap.values()).sort((a, b) => {
    if (b.units === a.units) {
      if (a.isMixed) return 1;
      if (b.isMixed) return -1;
      return a.productName.localeCompare(b.productName);
    }
    return b.units - a.units;
  });
}

/**
 * Cash / UPI split: Sales grouped by payment method, with amount and percentage.
 */
export function calculatePaymentSplit(salesRows = []) {
  let cashAmount = 0;
  let cashCount = 0;
  let upiAmount = 0;
  let upiCount = 0;

  for (const row of salesRows) {
    const amt = parseFloat(row.total_amount) || 0;
    if (row.payment_method === 'Cash') {
      cashAmount += amt;
      cashCount += 1;
    } else if (row.payment_method === 'UPI') {
      upiAmount += amt;
      upiCount += 1;
    }
  }

  cashAmount = round2(cashAmount);
  upiAmount = round2(upiAmount);
  const total = round2(cashAmount + upiAmount);

  return [
    {
      method: 'UPI',
      amount: upiAmount,
      count: upiCount,
      percentage: total > 0 ? round2((upiAmount / total) * 100) : 0,
    },
    {
      method: 'Cash',
      amount: cashAmount,
      count: cashCount,
      percentage: total > 0 ? round2((cashAmount / total) * 100) : 0,
    },
  ];
}

/**
 * Received-by split: Group sales by member.
 */
export function calculateReceivedBySplit(salesRows = [], members = []) {
  const memberMap = new Map();
  for (const m of members) {
    memberMap.set(m.id, {
      memberId: m.id,
      memberName: m.name,
      amount: 0,
      count: 0,
      percentage: 0,
    });
  }

  let totalSales = 0;
  for (const row of salesRows) {
    const amt = parseFloat(row.total_amount) || 0;
    totalSales += amt;
    const mId = row.received_by;
    const mName = row.received_by_name || 'Unknown';

    if (!memberMap.has(mId)) {
      memberMap.set(mId, {
        memberId: mId,
        memberName: mName,
        amount: 0,
        count: 0,
        percentage: 0,
      });
    }

    const current = memberMap.get(mId);
    current.amount = round2(current.amount + amt);
    current.count += 1;
  }

  totalSales = round2(totalSales);
  const result = Array.from(memberMap.values()).filter((item) => item.count > 0 || members.length <= 5);

  for (const item of result) {
    item.percentage = totalSales > 0 ? round2((item.amount / totalSales) * 100) : 0;
  }

  return result.sort((a, b) => b.amount - a.amount);
}

/**
 * Comparison helper between current period and previous period.
 */
export function calculateComparison(current, previous) {
  const c = round2(current);
  const p = round2(previous);
  const diff = round2(c - p);
  let percentChange = null;

  if (p === 0) {
    percentChange = c === 0 ? 0 : null;
  } else {
    percentChange = round2(((c - p) / Math.abs(p)) * 100);
  }

  return {
    current: c,
    previous: p,
    diff,
    percentChange,
  };
}

/**
 * Fetch and assemble the full dashboard dataset for Today (/api/today?date=YYYY-MM-DD)
 */
export async function getTodayDashboardData(dateStr) {
  const targetDate = dateStr || getTodayISTDateString();
  const yesterdayDate = offsetDate(targetDate, -1);
  const lastWeekDate = offsetDate(targetDate, -7);

  const salesQuery = `
    SELECT 
      s.id, s.timestamp, TO_CHAR(s.sale_date, 'YYYY-MM-DD') AS sale_date, s.product_id, s.quantity, 
      s.price_per_item, s.total_amount, s.payment_method, s.received_by, 
      s.notes, s.is_mixed, s.source,
      p.name AS product_name,
      m.name AS received_by_name
    FROM sales s
    LEFT JOIN products p ON s.product_id = p.id
    LEFT JOIN members m ON s.received_by = m.id
    WHERE s.sale_date IN ($1, $2, $3) AND s.deleted_at IS NULL
    ORDER BY s.timestamp DESC;
  `;

  const expensesQuery = `
    SELECT 
      e.id, e.timestamp, TO_CHAR(e.expense_date, 'YYYY-MM-DD') AS expense_date, e.category_id, e.description, 
      e.amount, e.payment_method, e.paid_by, e.expense_type, e.notes, e.source,
      c.name AS category_name,
      m.name AS paid_by_name
    FROM expenses e
    LEFT JOIN expense_categories c ON e.category_id = c.id
    LEFT JOIN members m ON e.paid_by = m.id
    WHERE e.expense_date IN ($1, $2, $3) AND e.deleted_at IS NULL
    ORDER BY e.timestamp DESC;
  `;

  const [salesRes, expensesRes, productsRes, membersRes] = await Promise.all([
    pool.query(salesQuery, [targetDate, yesterdayDate, lastWeekDate]),
    pool.query(expensesQuery, [targetDate, yesterdayDate, lastWeekDate]),
    pool.query('SELECT id, name, default_price FROM products WHERE is_active = true ORDER BY name;'),
    pool.query('SELECT id, name FROM members ORDER BY name;'),
  ]);

  const todaySales = salesRes.rows.filter((r) => r.sale_date === targetDate);
  const yesterdaySales = salesRes.rows.filter((r) => r.sale_date === yesterdayDate);
  const lastWeekSales = salesRes.rows.filter((r) => r.sale_date === lastWeekDate);

  const todayExpenses = expensesRes.rows.filter((r) => r.expense_date === targetDate);
  const yesterdayExpenses = expensesRes.rows.filter((r) => r.expense_date === yesterdayDate);
  const lastWeekExpenses = expensesRes.rows.filter((r) => r.expense_date === lastWeekDate);

  const sales = calculateSales(todaySales);
  const orders = calculateOrders(todaySales);
  const itemsSold = calculateItemsSold(todaySales);
  const avgPerOrder = calculateAveragePerOrder(sales, orders);
  const expenses = calculateExpenses(todayExpenses);
  const net = calculateNet(sales, expenses);

  const ySales = calculateSales(yesterdaySales);
  const yOrders = calculateOrders(yesterdaySales);
  const yItemsSold = calculateItemsSold(yesterdaySales);
  const yAvgPerOrder = calculateAveragePerOrder(ySales, yOrders);
  const yExpenses = calculateExpenses(yesterdayExpenses);
  const yNet = calculateNet(ySales, yExpenses);

  const lwSales = calculateSales(lastWeekSales);
  const lwOrders = calculateOrders(lastWeekSales);
  const lwItemsSold = calculateItemsSold(lastWeekSales);
  const lwAvgPerOrder = calculateAveragePerOrder(lwSales, lwOrders);
  const lwExpenses = calculateExpenses(lastWeekExpenses);
  const lwNet = calculateNet(lwSales, lwExpenses);

  return {
    date: targetDate,
    cards: {
      sales,
      orders,
      itemsSold,
      avgPerOrder,
      expenses,
      net,
      netNote: NET_NOTE,
    },
    comparisons: {
      yesterday: {
        date: yesterdayDate,
        sales: calculateComparison(sales, ySales),
        orders: calculateComparison(orders, yOrders),
        itemsSold: calculateComparison(itemsSold, yItemsSold),
        avgPerOrder: calculateComparison(avgPerOrder, yAvgPerOrder),
        expenses: calculateComparison(expenses, yExpenses),
        net: calculateComparison(net, yNet),
      },
      lastWeek: {
        date: lastWeekDate,
        sales: calculateComparison(sales, lwSales),
        orders: calculateComparison(orders, lwOrders),
        itemsSold: calculateComparison(itemsSold, lwItemsSold),
        avgPerOrder: calculateComparison(avgPerOrder, lwAvgPerOrder),
        expenses: calculateComparison(expenses, lwExpenses),
        net: calculateComparison(net, lwNet),
      },
    },
    paymentSplit: calculatePaymentSplit(todaySales),
    receivedBySplit: calculateReceivedBySplit(todaySales, membersRes.rows),
    products: calculateProductBreakdown(todaySales, productsRes.rows),
    sales: todaySales,
    expenses: todayExpenses,
  };
}

/**
 * Builds continuous timeline series with zero filling, 7-day MA, and growth %
 */
export function buildTimelineSeries({
  from,
  to,
  group = 'day',
  salesRows = [],
  expenseRows = [],
}) {
  const lookbackStart = offsetDate(from, -6);
  const allDays = generateDateRange(lookbackStart, to);

  const dailyMap = new Map();
  for (const day of allDays) {
    dailyMap.set(day, {
      date: day,
      sales: 0,
      orders: 0,
      itemsSold: 0,
      expenses: 0,
      net: 0,
    });
  }

  for (const s of salesRows) {
    const d = s.sale_date;
    if (dailyMap.has(d)) {
      const cur = dailyMap.get(d);
      cur.sales = round2(cur.sales + (parseFloat(s.total_amount) || 0));
      cur.orders += 1;
      cur.itemsSold += parseInt(s.quantity, 10) || 0;
    }
  }

  for (const e of expenseRows) {
    if (e.expense_type === 'Regular Business Expense') {
      const d = e.expense_date;
      if (dailyMap.has(d)) {
        const cur = dailyMap.get(d);
        cur.expenses = round2(cur.expenses + (parseFloat(e.amount) || 0));
      }
    }
  }

  for (const day of allDays) {
    const cur = dailyMap.get(day);
    cur.net = round2(cur.sales - cur.expenses);
  }

  // Calculate 7-day moving average for all target days
  const targetDays = generateDateRange(from, to);
  const dailyWithMA = targetDays.map((day) => {
    const cur = dailyMap.get(day);
    let sevenDaySum = 0;
    for (let i = 0; i < 7; i++) {
      const prevDate = offsetDate(day, -i);
      const prevData = dailyMap.get(prevDate);
      sevenDaySum += prevData ? prevData.sales : 0;
    }
    const movingAverage7Day = round2(sevenDaySum / 7);

    return {
      date: day,
      label: formatDateLabel(day),
      sales: cur.sales,
      orders: cur.orders,
      itemsSold: cur.itemsSold,
      expenses: cur.expenses,
      net: cur.net,
      movingAverage7Day,
    };
  });

  let bucketedSeries = [];

  if (group === 'day') {
    bucketedSeries = dailyWithMA;
  } else if (group === 'week') {
    const weekMap = new Map();
    for (const d of dailyWithMA) {
      const monday = getMondayOfWeek(d.date);
      if (!weekMap.has(monday)) {
        weekMap.set(monday, {
          date: monday,
          label: formatWeekLabel(monday),
          sales: 0,
          orders: 0,
          itemsSold: 0,
          expenses: 0,
          net: 0,
          movingAverage7Day: null,
        });
      }
      const w = weekMap.get(monday);
      w.sales = round2(w.sales + d.sales);
      w.orders += d.orders;
      w.itemsSold += d.itemsSold;
      w.expenses = round2(w.expenses + d.expenses);
      w.net = round2(w.net + d.net);
    }
    bucketedSeries = Array.from(weekMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  } else if (group === 'month') {
    const monthMap = new Map();
    for (const d of dailyWithMA) {
      const monthKey = d.date.slice(0, 7);
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          date: monthKey,
          label: formatMonthLabel(monthKey),
          sales: 0,
          orders: 0,
          itemsSold: 0,
          expenses: 0,
          net: 0,
          movingAverage7Day: null,
        });
      }
      const m = monthMap.get(monthKey);
      m.sales = round2(m.sales + d.sales);
      m.orders += d.orders;
      m.itemsSold += d.itemsSold;
      m.expenses = round2(m.expenses + d.expenses);
      m.net = round2(m.net + d.net);
    }
    bucketedSeries = Array.from(monthMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  // Calculate cumulative and growth percentage
  let cumSales = 0;
  let cumExpenses = 0;
  let cumNet = 0;

  for (let i = 0; i < bucketedSeries.length; i++) {
    const item = bucketedSeries[i];
    cumSales = round2(cumSales + item.sales);
    cumExpenses = round2(cumExpenses + item.expenses);
    cumNet = round2(cumNet + item.net);

    item.cumulativeSales = cumSales;
    item.cumulativeExpenses = cumExpenses;
    item.cumulativeNet = cumNet;

    if (i === 0) {
      item.growthPct = null; // Shown as "n/a" for the first period
    } else {
      const prevSales = bucketedSeries[i - 1].sales;
      if (prevSales === 0) {
        item.growthPct = item.sales === 0 ? 0 : null;
      } else {
        item.growthPct = round2(((item.sales - prevSales) / prevSales) * 100);
      }
    }
  }

  return bucketedSeries;
}

/**
 * Fetch and assemble full Sales Dashboard data (/api/sales?from=&to=&group=)
 */
export async function getSalesDashboardData({ from, to, group = 'day' }) {
  const effectiveFrom = from || getCurrentMonthStartISTDateString();
  const effectiveTo = to || getTodayISTDateString();
  const effectiveGroup = ['day', 'week', 'month'].includes(group) ? group : 'day';
  const lookbackStart = offsetDate(effectiveFrom, -6);

  const salesQuery = `
    SELECT 
      s.id, s.timestamp, TO_CHAR(s.sale_date, 'YYYY-MM-DD') AS sale_date, s.product_id, s.quantity, 
      s.price_per_item, s.total_amount, s.payment_method, s.received_by, 
      s.notes, s.is_mixed, s.source,
      p.name AS product_name,
      m.name AS received_by_name
    FROM sales s
    LEFT JOIN products p ON s.product_id = p.id
    LEFT JOIN members m ON s.received_by = m.id
    WHERE s.sale_date >= $1 AND s.sale_date <= $2 AND s.deleted_at IS NULL
    ORDER BY s.sale_date ASC, s.timestamp ASC;
  `;

  const [salesRes, productsRes, membersRes] = await Promise.all([
    pool.query(salesQuery, [lookbackStart, effectiveTo]),
    pool.query('SELECT id, name, default_price FROM products WHERE is_active = true ORDER BY name;'),
    pool.query('SELECT id, name FROM members ORDER BY name;'),
  ]);

  const salesInRange = salesRes.rows.filter(
    (s) => s.sale_date >= effectiveFrom && s.sale_date <= effectiveTo
  );

  const sales = calculateSales(salesInRange);
  const orders = calculateOrders(salesInRange);
  const itemsSold = calculateItemsSold(salesInRange);
  const avgPerOrder = calculateAveragePerOrder(sales, orders);

  const totalDays = generateDateRange(effectiveFrom, effectiveTo).length;
  const avgDailySales = totalDays > 0 ? round2(sales / totalDays) : 0;

  // Build timeline series
  const chartSeries = buildTimelineSeries({
    from: effectiveFrom,
    to: effectiveTo,
    group: effectiveGroup,
    salesRows: salesRes.rows,
  });

  // Calculate best day
  const dailyBreakdown = new Map();
  for (const s of salesInRange) {
    dailyBreakdown.set(
      s.sale_date,
      round2((dailyBreakdown.get(s.sale_date) || 0) + (parseFloat(s.total_amount) || 0))
    );
  }

  let bestDay = { date: null, sales: 0 };
  for (const [d, amt] of dailyBreakdown.entries()) {
    if (amt > bestDay.sales) {
      bestDay = { date: d, sales: amt };
    }
  }

  // Hourly data (0 to 23 in IST)
  const hourly = Array.from({ length: 24 }, (_, h) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return {
      hour: h,
      label: `${hour12} ${ampm}`,
      sales: 0,
      orders: 0,
      itemsSold: 0,
    };
  });

  const istHourFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    hour12: false,
  });

  for (const s of salesInRange) {
    if (s.timestamp) {
      try {
        const hr = parseInt(istHourFormatter.format(new Date(s.timestamp)), 10) % 24;
        if (!isNaN(hr) && hourly[hr]) {
          hourly[hr].sales = round2(hourly[hr].sales + (parseFloat(s.total_amount) || 0));
          hourly[hr].orders += 1;
          hourly[hr].itemsSold += parseInt(s.quantity, 10) || 0;
        }
      } catch (e) {
        // Fallback gracefully on parsing
      }
    }
  }

  const productTable = calculateProductBreakdown(salesInRange, productsRes.rows);
  const paymentSplit = calculatePaymentSplit(salesInRange);
  const memberSplit = calculateReceivedBySplit(salesInRange, membersRes.rows);

  return {
    range: { from: effectiveFrom, to: effectiveTo, group: effectiveGroup },
    cards: {
      sales,
      orders,
      itemsSold,
      avgPerOrder,
      bestDay,
      avgDailySales,
    },
    chartSeries,
    productTable,
    paymentSplit,
    memberSplit,
    hourlyData: hourly,
  };
}

/**
 * Fetch and assemble full Expenses Dashboard data (/api/expenses?from=&to=&group=)
 */
export async function getExpensesDashboardData({ from, to, group = 'day' }) {
  const effectiveFrom = from || getCurrentMonthStartISTDateString();
  const effectiveTo = to || getTodayISTDateString();
  const effectiveGroup = ['day', 'week', 'month'].includes(group) ? group : 'day';

  const expensesQuery = `
    SELECT 
      e.id, e.timestamp, TO_CHAR(e.expense_date, 'YYYY-MM-DD') AS expense_date, e.category_id, e.description, 
      e.amount, e.payment_method, e.paid_by, e.expense_type, e.notes, e.source,
      c.name AS category_name,
      m.name AS paid_by_name
    FROM expenses e
    LEFT JOIN expense_categories c ON e.category_id = c.id
    LEFT JOIN members m ON e.paid_by = m.id
    WHERE e.expense_date >= $1 AND e.expense_date <= $2 AND e.deleted_at IS NULL
    ORDER BY e.expense_date ASC, e.timestamp ASC;
  `;

  const salesQuery = `
    SELECT 
      s.id, TO_CHAR(s.sale_date, 'YYYY-MM-DD') AS sale_date, s.total_amount
    FROM sales s
    WHERE s.sale_date >= $1 AND s.sale_date <= $2 AND s.deleted_at IS NULL;
  `;

  const allTimeInvestmentQuery = `
    SELECT COALESCE(SUM(amount), 0) AS total_investment
    FROM expenses
    WHERE expense_type = 'Initial Investment' AND deleted_at IS NULL;
  `;

  const [expensesRes, salesRes, allTimeInvRes, categoriesRes] = await Promise.all([
    pool.query(expensesQuery, [effectiveFrom, effectiveTo]),
    pool.query(salesQuery, [effectiveFrom, effectiveTo]),
    pool.query(allTimeInvestmentQuery),
    pool.query('SELECT id, name FROM expense_categories ORDER BY name;'),
  ]);

  const regularExpenses = expensesRes.rows.filter((e) => e.expense_type === 'Regular Business Expense');
  const initialInvestments = expensesRes.rows.filter((e) => e.expense_type === 'Initial Investment');

  const expenses = calculateExpenses(expensesRes.rows);
  const sales = calculateSales(salesRes.rows);
  const net = calculateNet(sales, expenses);
  const investment = calculateInvestment(initialInvestments);
  const totalInvestmentAllTime = round2(parseFloat(allTimeInvRes.rows[0].total_investment) || 0);

  // Group by category for category table and chart
  const categoryMap = new Map();
  for (const c of categoriesRes.rows) {
    categoryMap.set(c.id, {
      categoryId: c.id,
      categoryName: c.name,
      amount: 0,
      count: 0,
      percentage: 0,
    });
  }

  for (const e of regularExpenses) {
    const cId = e.category_id;
    const cName = e.category_name || 'Other';
    const amt = parseFloat(e.amount) || 0;

    if (!categoryMap.has(cId)) {
      categoryMap.set(cId, {
        categoryId: cId,
        categoryName: cName,
        amount: 0,
        count: 0,
        percentage: 0,
      });
    }

    const cur = categoryMap.get(cId);
    cur.amount = round2(cur.amount + amt);
    cur.count += 1;
  }

  const categoryTable = Array.from(categoryMap.values()).map((c) => ({
    ...c,
    percentage: expenses > 0 ? round2((c.amount / expenses) * 100) : 0,
  })).sort((a, b) => b.amount - a.amount);

  const biggestCategory = categoryTable.length > 0 && categoryTable[0].amount > 0
    ? categoryTable[0]
    : { categoryId: null, categoryName: 'None', amount: 0, percentage: 0 };

  // Payment method split
  let upiAmt = 0;
  let cashAmt = 0;
  let personalAmt = 0;

  for (const e of regularExpenses) {
    const amt = parseFloat(e.amount) || 0;
    if (e.payment_method === 'UPI') upiAmt += amt;
    else if (e.payment_method === 'Cash') cashAmt += amt;
    else if (e.payment_method === 'Personal Payment') personalAmt += amt;
  }

  upiAmt = round2(upiAmt);
  cashAmt = round2(cashAmt);
  personalAmt = round2(personalAmt);
  const totalRegExpenses = round2(upiAmt + cashAmt + personalAmt);

  const paymentSplit = [
    {
      method: 'UPI',
      amount: upiAmt,
      percentage: totalRegExpenses > 0 ? round2((upiAmt / totalRegExpenses) * 100) : 0,
    },
    {
      method: 'Cash',
      amount: cashAmt,
      percentage: totalRegExpenses > 0 ? round2((cashAmt / totalRegExpenses) * 100) : 0,
    },
    {
      method: 'Personal Payment',
      amount: personalAmt,
      percentage: totalRegExpenses > 0 ? round2((personalAmt / totalRegExpenses) * 100) : 0,
    },
  ];

  // Timeline series for Expenses, Net, Cumulative Net with payback point
  const timelineSeries = buildTimelineSeries({
    from: effectiveFrom,
    to: effectiveTo,
    group: effectiveGroup,
    salesRows: salesRes.rows,
    expenseRows: expensesRes.rows,
  });

  const chartSeries = timelineSeries.map((item) => ({
    date: item.date,
    label: item.label,
    expenses: item.expenses,
    sales: item.sales,
    net: item.net,
    cumulativeExpenses: item.cumulativeExpenses,
    cumulativeNet: item.cumulativeNet,
    paybackPoint: totalInvestmentAllTime,
  }));

  // Investment list
  const investmentList = initialInvestments.map((inv) => ({
    id: inv.id,
    date: inv.expense_date,
    memberName: inv.paid_by_name || 'Unknown',
    amount: round2(parseFloat(inv.amount) || 0),
    paymentMethod: inv.payment_method,
    notes: inv.notes,
  }));

  return {
    range: { from: effectiveFrom, to: effectiveTo, group: effectiveGroup },
    cards: {
      expenses,
      investmentTotal: investment.total,
      investmentsByMember: investment.byMember,
      investmentAllTime: totalInvestmentAllTime,
      net,
      biggestCategory,
      netNote: NET_NOTE,
    },
    chartSeries,
    categoryTable,
    paymentSplit,
    investmentList,
  };
}

/**
 * Fetch and assemble Overview Dashboard data (/api/overview?from=&to=&group=)
 */
export async function getOverviewDashboardData({ from, to, group = 'day' }) {
  const effectiveFrom = from || getCurrentMonthStartISTDateString();
  const effectiveTo = to || getTodayISTDateString();
  const effectiveGroup = ['day', 'week', 'month'].includes(group) ? group : 'day';

  const [salesData, expensesData] = await Promise.all([
    getSalesDashboardData({ from: effectiveFrom, to: effectiveTo, group: effectiveGroup }),
    getExpensesDashboardData({ from: effectiveFrom, to: effectiveTo, group: effectiveGroup }),
  ]);

  const allTimeInvRes = await pool.query(
    "SELECT COALESCE(SUM(amount), 0) AS total_investment FROM expenses WHERE expense_type = 'Initial Investment' AND deleted_at IS NULL;"
  );
  const totalInvestmentAllTime = round2(parseFloat(allTimeInvRes.rows[0].total_investment) || 0);

  const allTimeNetRes = await pool.query(`
    SELECT 
      (COALESCE((SELECT SUM(total_amount) FROM sales WHERE deleted_at IS NULL), 0) -
       COALESCE((SELECT SUM(amount) FROM expenses WHERE expense_type = 'Regular Business Expense' AND deleted_at IS NULL), 0)) AS net_all_time;
  `);
  const netAllTime = round2(parseFloat(allTimeNetRes.rows[0].net_all_time) || 0);

  const payback = calculatePaybackProgress(netAllTime, totalInvestmentAllTime);

  return {
    range: { from: effectiveFrom, to: effectiveTo, group: effectiveGroup },
    cards: {
      sales: salesData.cards.sales,
      expenses: expensesData.cards.expenses,
      net: expensesData.cards.net,
      payback,
      netNote: NET_NOTE,
    },
    series: expensesData.chartSeries.map((item, idx) => ({
      date: item.date,
      label: item.label,
      sales: item.sales,
      expenses: item.expenses,
      net: item.net,
      growthPct: salesData.chartSeries[idx]?.growthPct ?? null,
      cumulativeSales: salesData.chartSeries[idx]?.cumulativeSales ?? 0,
      cumulativeNet: item.cumulativeNet,
      paybackPoint: totalInvestmentAllTime,
    })),
  };
}
