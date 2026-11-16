export * from './dataCheck.service.js';

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
