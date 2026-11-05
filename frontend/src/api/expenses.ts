import type { CurrentDrawer, DrawerShiftOption, Expense, ExpenseCreate, ExpenseList, ExpensePeriods } from '../types'
import { apiDelete, apiGet, apiPost } from './client'

export interface ExpenseQuery {
  page: number
  pageSize: number
  dateFrom?: string
  dateTo?: string
  category?: string
  paidFrom?: string
  q?: string
}

export function createExpense(body: ExpenseCreate) {
  return apiPost<Expense>('/expenses', body)
}

export function listExpenses(query: ExpenseQuery) {
  return apiGet<ExpenseList>('/expenses', {
    params: {
      page: query.page,
      page_size: query.pageSize,
      date_from: query.dateFrom || undefined,
      date_to: query.dateTo || undefined,
      category: query.category || undefined,
      paid_from: query.paidFrom || undefined,
      q: query.q || undefined,
    },
  })
}

export function expenseSummary() {
  return apiGet<ExpensePeriods>('/expenses/summary')
}

export function drawerShifts() {
  return apiGet<DrawerShiftOption[]>('/expenses/drawer-shifts')
}

export function currentDrawer() {
  return apiGet<CurrentDrawer>('/expenses/current-drawer')
}

export function getExpense(expenseId: number) {
  return apiGet<Expense>(`/expenses/${expenseId}`)
}

export function deleteExpense(expenseId: number) {
  return apiDelete(`/expenses/${expenseId}`)
}
