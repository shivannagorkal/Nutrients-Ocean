import { useQuery } from '@tanstack/react-query';
import api from './client';

export interface Member {
  id: string;
  name: string;
  email: string | null;
}

export interface Product {
  id: string;
  name: string;
  default_price: number;
  is_active: boolean;
}

export interface Category {
  id: string;
  name: string;
}

export interface Enums {
  payment_methods: string[];
  expense_payment_methods: string[];
  expense_types: string[];
}

export interface Metadata {
  members: Member[];
  products: Product[];
  categories: Category[];
  enums: Enums;
}

export function useMetadata() {
  return useQuery<Metadata>({
    queryKey: ['meta'],
    queryFn: async () => {
      const res: any = await api.get('/meta');
      return res;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}
