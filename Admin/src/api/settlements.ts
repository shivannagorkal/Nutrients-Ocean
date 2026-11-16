import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './client';

export interface SettlementRecord {
  id: string;
  settlement_date: string;
  amount: number;
  paid_by: string;
  paid_to: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  paid_by_name?: string;
  paid_to_name?: string;
}

export function useSettlements() {
  return useQuery<{ records: SettlementRecord[] }>({
    queryKey: ['settlements'],
    queryFn: async () => {
      const res: any = await api.get('/settlements');
      return res;
    },
  });
}

export function useCreateSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res: any = await api.post('/settlements', data);
      return res.record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });
}

export function useUpdateSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res: any = await api.put(`/settlements/${id}`, data);
      return res.record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });
}

export function useDeleteSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res: any = await api.delete(`/settlements/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });
}
