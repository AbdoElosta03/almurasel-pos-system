import type { Product, ProductCreate, ProductUpdate } from '../types'
import type { PaginatedResult } from '../types/common'
import { apiDelete, apiGet, apiPatch, apiPost } from './client'

export function listProducts(categoryId?: number) {
  return apiGet<Product[]>('/products', {
    params: categoryId === undefined ? undefined : { category_id: categoryId },
  })
}

export function listProductsPage(page: number, pageSize: number) {
  return apiGet<PaginatedResult<Product>>('/products', { params: { page, page_size: pageSize } })
}

export function createProduct(body: ProductCreate) {
  return apiPost<Product>('/products', body)
}

export function updateProduct(productId: number, body: ProductUpdate) {
  return apiPatch<Product>(`/products/${productId}`, body)
}

export function uploadProductImage(productId: number, file: File) {
  return apiPost<Product>(`/products/${productId}/image`, file, {
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  })
}

export function removeProductImage(productId: number) {
  return apiDelete(`/products/${productId}/image`)
}

export function deleteProduct(productId: number) {
  return apiDelete(`/products/${productId}`)
}
