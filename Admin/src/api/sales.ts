import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './client';

export interface SaleRecord {
  id: string;
  timestamp: string;
  sale_date: string;
  product_id: string;
  quantity: number;
  price_per_item: number | null;
  total_amount: number;
  payment_method: 'UPI' | 'Cash';
  received_by: string;
  notes: string | null;
  is_mixed: boolean;
  source: 'app' | 'import';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  product_name?: string;
  received_by_name?: string;
  order_group_id?: string | null;
  receipt_number?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
}

export interface SalesResponse {
  records: SaleRecord[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface ListSalesParams {
  from?: string;
  to?: string;
  product?: string;
  payment?: string;
  member?: string;
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
}

export interface SalesDashboardData {
  range: { from: string; to: string; group: 'day' | 'week' | 'month' };
  cards: {
    sales: number;
    orders: number;
    itemsSold: number;
    avgPerOrder: number;
    bestDay: { date: string | null; sales: number };
    avgDailySales: number;
  };
  chartSeries: Array<{
    date: string;
    label: string;
    sales: number;
    orders: number;
    itemsSold: number;
    expenses?: number;
    net?: number;
    movingAverage7Day: number | null;
    cumulativeSales: number;
    growthPct: number | null;
  }>;
  productTable: Array<{
    productId: string;
    productName: string;
    units: number;
    sales: number;
    isMixed: boolean;
    defaultPrice?: number | null;
  }>;
  paymentSplit: Array<{
    method: 'UPI' | 'Cash';
    amount: number;
    count: number;
    percentage: number;
  }>;
  memberSplit: Array<{
    memberId: string;
    memberName: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  hourlyData: Array<{
    hour: number;
    label: string;
    sales: number;
    orders: number;
    itemsSold: number;
  }>;
}

export function useSales(params: ListSalesParams = {}) {
  return useQuery<SalesResponse>({
    queryKey: ['sales', params],
    queryFn: async () => {
      const res: any = await api.get('/sales/records', { params });
      return res;
    },
  });
}

export function useSalesDashboard(params: { from?: string; to?: string; group?: 'day' | 'week' | 'month' } = {}) {
  return useQuery<SalesDashboardData>({
    queryKey: ['sales-dashboard', params],
    queryFn: async () => {
      const res: any = await api.get('/sales', { params });
      return res;
    },
  });
}

export interface SaleOrderItem {
  product_id: string;
  quantity: number;
  price_per_item?: number | null;
  total_amount?: number;
  notes?: string | null;
}

export interface CreateSaleOrderPayload {
  sale_date: string;
  payment_method: 'UPI' | 'Cash';
  received_by: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  notes?: string | null;
  items: SaleOrderItem[];
}

export function useCreateSaleOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSaleOrderPayload) => {
      const res: any = await api.post('/sales/order', data);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
    },
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res: any = await api.post('/sales/records', data);
      return res.record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
    },
  });
}

export function useUpdateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res: any = await api.put(`/sales/records/${id}`, data);
      return res.record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
    },
  });
}

export function useDeleteSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res: any = await api.delete(`/sales/records/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
    },
  });
}
