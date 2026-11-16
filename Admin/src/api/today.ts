import { useQuery } from '@tanstack/react-query';
import api from './client';
import { SaleRecord } from './sales';
import { ExpenseRecord } from './expenses';

export interface MetricComparison {
  current: number;
  previous: number;
  diff: number;
  percentChange: number | null;
}

export interface TodayDashboardCards {
  sales: number;
  orders: number;
  itemsSold: number;
  avgPerOrder: number;
  expenses: number;
  net: number;
  netNote: string;
}

export interface TodayComparisonGroup {
  date: string;
  sales: MetricComparison;
  orders: MetricComparison;
  itemsSold: MetricComparison;
  avgPerOrder: MetricComparison;
  expenses: MetricComparison;
  net: MetricComparison;
}

export interface TodayPaymentSplit {
  method: 'UPI' | 'Cash';
  amount: number;
  count: number;
  percentage: number;
}

export interface TodayReceivedBySplit {
  memberId: string;
  memberName: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface TodayProduct {
  productId: string;
  productName: string;
  units: number;
  sales: number;
  isMixed: boolean;
  defaultPrice?: number | null;
}

export interface TodayDashboardResponse {
  date: string;
  cards: TodayDashboardCards;
  comparisons: {
    yesterday: TodayComparisonGroup;
    lastWeek: TodayComparisonGroup;
  };
  paymentSplit: TodayPaymentSplit[];
  receivedBySplit: TodayReceivedBySplit[];
  products: TodayProduct[];
  sales: SaleRecord[];
  expenses: ExpenseRecord[];
}

export function getTodayISTDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function useToday(date?: string) {
  const effectiveDate = date || getTodayISTDate();
  return useQuery<TodayDashboardResponse>({
    queryKey: ['today', effectiveDate],
    queryFn: async () => {
      const res: any = await api.get('/today', { params: { date: effectiveDate } });
      return res;
    },
  });
}
