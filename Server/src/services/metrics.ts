export * from './metrics.service.js';

export interface SalesRow {
  id?: string;
  timestamp?: string;
  sale_date?: string | Date;
  product_id?: string;
  product_name?: string;
  quantity?: number | string;
  price_per_item?: number | string | null;
  total_amount?: number | string;
  payment_method?: 'UPI' | 'Cash';
  received_by?: string;
  received_by_name?: string;
  notes?: string | null;
  is_mixed?: boolean;
  source?: 'app' | 'import';
  deleted_at?: string | null;
}

export interface ExpenseRow {
  id?: string;
  timestamp?: string;
  expense_date?: string | Date;
  category_id?: string;
  category_name?: string;
  description?: string;
  amount?: number | string;
  payment_method?: 'UPI' | 'Cash' | 'Personal Payment';
  paid_by?: string;
  paid_by_name?: string;
  expense_type?: 'Regular Business Expense' | 'Initial Investment';
  notes?: string | null;
  source?: 'app' | 'import';
  deleted_at?: string | null;
}

export interface SettlementRow {
  id?: string;
  settlement_date?: string | Date;
  amount?: number | string;
  paid_by?: string;
  paid_to?: string;
  notes?: string | null;
  deleted_at?: string | null;
}

export interface MetricComparison {
  current: number;
  previous: number;
  diff: number;
  percentChange: number | null;
}

export interface TodayDashboardResponse {
  date: string;
  cards: {
    sales: number;
    orders: number;
    itemsSold: number;
    avgPerOrder: number;
    expenses: number;
    net: number;
    netNote: string;
  };
  comparisons: {
    yesterday: {
      date: string;
      sales: MetricComparison;
      orders: MetricComparison;
      itemsSold: MetricComparison;
      avgPerOrder: MetricComparison;
      expenses: MetricComparison;
      net: MetricComparison;
    };
    lastWeek: {
      date: string;
      sales: MetricComparison;
      orders: MetricComparison;
      itemsSold: MetricComparison;
      avgPerOrder: MetricComparison;
      expenses: MetricComparison;
      net: MetricComparison;
    };
  };
  paymentSplit: Array<{
    method: 'UPI' | 'Cash';
    amount: number;
    count: number;
    percentage: number;
  }>;
  receivedBySplit: Array<{
    memberId: string;
    memberName: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  products: Array<{
    productId: string;
    productName: string;
    units: number;
    sales: number;
    isMixed: boolean;
    defaultPrice?: number | null;
  }>;
  sales: SalesRow[];
  expenses: ExpenseRow[];
}
