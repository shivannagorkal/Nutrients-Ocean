import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './client';

export interface ExpenseRecord {
  id: string;
  timestamp: string;
  expense_date: string;
  category_id: string;
  description: string;
  amount: number;
  payment_method: 'UPI' | 'Cash' | 'Personal Payment';
  paid_by: string;
  expense_type: 'Regular Business Expense' | 'Initial Investment';
  notes: string | null;
  source: 'app' | 'import';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category_name?: string;
  paid_by_name?: string;
  expense_group_id?: string | null;
  receipt_number?: string | null;
}

export interface ExpensesResponse {
  records: ExpenseRecord[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface ListExpensesParams {
  from?: string;
  to?: string;
  category?: string;
  type?: string;
  payment?: string;
  member?: string;
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
}

export interface ExpensesDashboardData {
  range: { from: string; to: string; group: 'day' | 'week' | 'month' };
  cards: {
    expenses: number;
    investmentTotal: number;
    investmentsByMember: Record<string, number>;
    investmentAllTime: number;
    net: number;
    biggestCategory: {
      categoryId: string | null;
      categoryName: string;
      amount: number;
      percentage: number;
    };
    netNote: string;
  };
  chartSeries: Array<{
    date: string;
    label: string;
    expenses: number;
    sales: number;
    net: number;
    cumulativeExpenses: number;
    cumulativeNet: number;
    paybackPoint: number;
  }>;
  categoryTable: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  paymentSplit: Array<{
    method: string;
    amount: number;
    percentage: number;
  }>;
  investmentList: Array<{
    id: string;
    date: string;
    memberName: string;
    amount: number;
    paymentMethod: string;
    notes: string | null;
  }>;
}

export function useExpenses(params: ListExpensesParams = {}) {
  return useQuery<ExpensesResponse>({
    queryKey: ['expenses', params],
    queryFn: async () => {
      const res: any = await api.get('/expenses/records', { params });
      return res;
    },
  });
}

export function useExpensesDashboard(params: { from?: string; to?: string; group?: 'day' | 'week' | 'month' } = {}) {
  return useQuery<ExpensesDashboardData>({
    queryKey: ['expenses-dashboard', params],
    queryFn: async () => {
      const res: any = await api.get('/expenses', { params });
      return res;
    },
  });
}

export interface ExpenseBillItem {
  category_id: string;
  description: string;
  amount: number;
  notes?: string | null;
}

export interface CreateExpenseBillPayload {
  expense_date: string;
  expense_type: 'Regular Business Expense' | 'Initial Investment';
  payment_method: 'UPI' | 'Cash' | 'Personal Payment';
  paid_by: string;
  notes?: string | null;
  items: ExpenseBillItem[];
}

export function useCreateExpenseBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateExpenseBillPayload) => {
      const res: any = await api.post('/expenses/bill', data);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res: any = await api.post('/expenses/records', data);
      return res.record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res: any = await api.put(`/expenses/records/${id}`, data);
      return res.record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res: any = await api.delete(`/expenses/records/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
    },
  });
}
