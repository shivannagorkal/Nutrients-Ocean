import { useQuery } from '@tanstack/react-query';
import api from './client';

export interface DataCheckIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  rule: string;
  message: string;
  entity: 'sale' | 'expense' | 'settlement' | 'member' | 'system';
  entityId?: string;
  record?: any;
  details?: any;
}

export interface DataCheckResponse {
  summary: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
  };
  issues: DataCheckIssue[];
}

export function useDataCheck() {
  return useQuery<DataCheckResponse>({
    queryKey: ['data-check'],
    queryFn: async () => {
      const res: any = await api.get('/data-check');
      return res;
    },
  });
}
