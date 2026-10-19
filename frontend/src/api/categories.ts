import type { Category, CategoryCreate, CategoryUpdate } from '../types'
import type { PaginatedResult } from '../types/common'
import { apiDelete, apiGet, apiPatch, apiPost } from './client'

export function listCategories() {
  return apiGet<Category[]>('/categories')
}

export function listCategoriesPage(page: number, pageSize: number) {
  return apiGet<PaginatedResult<Category>>('/categories', { params: { page, page_size: pageSize } })
}

export function createCategory(body: CategoryCreate) {
  return apiPost<Category>('/categories', body)
}

export function updateCategory(categoryId: number, body: CategoryUpdate) {
  return apiPatch<Category>(`/categories/${categoryId}`, body)
}

export function deleteCategory(categoryId: number) {
  return apiDelete(`/categories/${categoryId}`)
}
