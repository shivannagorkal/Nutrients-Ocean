import { useQuery } from '@tanstack/react-query';
import api from './client';
import { SettlementRecord } from './settlements';

export interface PartnerBalance {
  memberId: string;
  memberName: string;
  invested: number;
  paidPersonally: number;
  reimbursed: number;
  stillOwed: number;
  isOverpaid: boolean;
}

export interface EstimatedRevenueBalance {
  label: string;
  totalSales: number;
  businessPaidExpenses: number;
  totalReimbursed: number;
  estimatedBalance: number;
  note: string;
}

export interface PartnersDashboardResponse {
  payback: {
    ratio: number;
    percentage: number;
    netAllTime: number;
    totalInvestment: number;
  };
  partners: PartnerBalance[];
  estimatedRevenueBalance: EstimatedRevenueBalance;
  settlements: SettlementRecord[];
}

export function usePartnersDashboard() {
  return useQuery<PartnersDashboardResponse>({
    queryKey: ['partners'],
    queryFn: async () => {
      const res: any = await api.get('/partners');
      return res;
    },
  });
}
