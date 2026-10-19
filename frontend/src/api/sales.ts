import type { Sale, SaleCreate } from '../types'
import { apiPost } from './client'

export function createSale(body: SaleCreate) {
  return apiPost<Sale>('/sales', body)
}

export function cancelSale(saleId: number) {
  return apiPost<Sale>(`/sales/${saleId}/cancel`)
}
