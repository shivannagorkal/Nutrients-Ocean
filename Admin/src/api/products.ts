import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './client';

export interface ProductItem {
  id: string;
  name: string;
  default_price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useProducts() {
  return useQuery<{ products: ProductItem[] }>({
    queryKey: ['products'],
    queryFn: async () => {
      const res: any = await api.get('/products');
      return res;
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; default_price?: number | null; is_active?: boolean }) => {
      const res: any = await api.post('/products', data);
      return res.product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['meta'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; default_price?: number | null; is_active?: boolean };
    }) => {
      const res: any = await api.put(`/products/${id}`, data);
      return res.product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['meta'] });
    },
  });
}
