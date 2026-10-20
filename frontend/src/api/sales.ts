import type { Sale, SaleCreate, SalePage } from '../types'
import { apiGet, apiPost } from './client'

export function createSale(body: SaleCreate) {
  return apiPost<Sale>('/sales', body)
}

export function listMyOpenShiftSales(page: number, pageSize: number) {
  return apiGet<SalePage>('/sales/my-open-shift', { params: { page, page_size: pageSize } })
}

export function getMyOpenShiftSale(saleId: number) {
  return apiGet<Sale>(`/sales/my-open-shift/${saleId}`)
}

export function cancelSale(saleId: number) {
  return apiPost<Sale>(`/sales/${saleId}/cancel`)
}
