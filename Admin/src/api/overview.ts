import { useQuery } from '@tanstack/react-query';
import api from './client';

export interface OverviewDashboardData {
  range: { from: string; to: string; group: 'day' | 'week' | 'month' };
  cards: {
    sales: number;
    expenses: number;
    net: number;
    payback: {
      ratio: number;
      percentage: number;
      netAllTime: number;
      totalInvestment: number;
    };
    netNote: string;
  };
  series: Array<{
    date: string;
    label: string;
    sales: number;
    expenses: number;
    net: number;
    growthPct: number | null;
    cumulativeSales: number;
    cumulativeNet: number;
    paybackPoint: number;
  }>;
}

export function useOverviewDashboard(params: { from?: string; to?: string; group?: 'day' | 'week' | 'month' } = {}) {
  return useQuery<OverviewDashboardData>({
    queryKey: ['overview', params],
    queryFn: async () => {
      const res: any = await api.get('/overview', { params });
      return res;
    },
  });
}
