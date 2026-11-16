import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './client';

export interface CategoryItem {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export function useCategories() {
  return useQuery<{ categories: CategoryItem[] }>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res: any = await api.get('/categories');
      return res;
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const res: any = await api.post('/categories', data);
      return res.category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['meta'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string } }) => {
      const res: any = await api.put(`/categories/${id}`, data);
      return res.category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['meta'] });
    },
  });
}
