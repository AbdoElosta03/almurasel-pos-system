import { apiPost, http } from './client'

export async function printerStatus() {
  const { data } = await http.get<{ ready: boolean; code: string; name: string }>('/printer/status')
  return data
}

export function printReceipt(saleId: number) {
  // A one-shot request. Never retry and never fall back to the browser spooler.
  return apiPost<{ status: 'released'; job_id: number }>(`/sales/${saleId}/print`)
}
