import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './client';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  flavor?: string | null;
  quantity: number;
  unit_price_paise: number;
  total_price_paise: number;
}

export interface AdminOrder {
  id: string;
  order_number: string;
  customer_id?: string | null;
  customer_name: string;
  customer_phone: string;
  subtotal_paise: number;
  delivery_fee_paise: number;
  total_paise: number;
  fulfillment_type: 'PICKUP' | 'DELIVERY';
  delivery_bracket?: string;
  delivery_address?: string | null;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  collection_slot: 'MORNING' | 'EVENING';
  scheduled_date: string;
  payment_method: 'PAY_AT_STALL' | 'UPI_DIRECT' | 'RAZORPAY';
  payment_status: 'PENDING' | 'PAID' | 'FAILED';
  order_status: 'RECEIVED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface FetchOrdersParams {
  date?: string;
  status?: string;
  slot?: string;
}

export async function fetchOrders(params?: FetchOrdersParams): Promise<AdminOrder[]> {
  const query = new URLSearchParams();
  if (params?.date) query.set('date', params.date);
  if (params?.status && params.status !== 'ALL') query.set('status', params.status);
  if (params?.slot && params.slot !== 'ALL') query.set('slot', params.slot);

  const res = await api.get<{ success: boolean; data: AdminOrder[] }>(`/orders?${query.toString()}`);
  return (res as any).data || [];
}

export async function updateOrderStatus(orderId: string, payload: { orderStatus?: string; paymentStatus?: string }): Promise<AdminOrder> {
  const res = await api.patch<{ success: boolean; data: AdminOrder }>(`/orders/${orderId}/status`, payload);
  return (res as any).data;
}

export function useOrders(params?: FetchOrdersParams) {
  return useQuery({
    queryKey: ['admin-orders', params],
    queryFn: () => fetchOrders(params),
    refetchInterval: 10000, // Auto refresh every 10 seconds for real-time kitchen display
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: { orderStatus?: string; paymentStatus?: string } }) =>
      updateOrderStatus(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
}
