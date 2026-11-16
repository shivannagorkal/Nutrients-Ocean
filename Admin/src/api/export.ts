import api from './client';

export async function downloadExportFile(type: 'sales' | 'expenses', from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const url = `/export/${type}.csv${qs}`;

  const response: any = await api.get(url, {
    responseType: 'blob',
  });

  const blob = new Blob([response], { type: 'text/csv;charset=utf-8;' });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', `${type}_${from || 'from'}_to_${to || 'to'}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
}
