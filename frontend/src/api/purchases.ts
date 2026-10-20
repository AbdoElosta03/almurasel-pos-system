import type { PaginatedResult } from '../types/common'
import type { Purchase, PurchaseCreate, PurchaseSummary } from '../types'
import { apiDelete, apiGet, apiPost } from './client'

export function createPurchase(body: PurchaseCreate) {
  return apiPost<Purchase>('/purchases', body)
}

export function listPurchases(page: number, pageSize: number) {
  return apiGet<PaginatedResult<PurchaseSummary>>('/purchases', { params: { page, page_size: pageSize } })
}

export function getPurchase(purchaseId: number) {
  return apiGet<Purchase>(`/purchases/${purchaseId}`)
}

export function deletePurchase(purchaseId: number) {
  return apiDelete(`/purchases/${purchaseId}`)
}
