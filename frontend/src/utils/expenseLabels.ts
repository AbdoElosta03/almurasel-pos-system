import type { ExpenseCategory, ExpenseSource } from '../types'

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  wage: 'أجور',
  supplier_payment: 'دفعات للموردين',
  other: 'مصروفات أخرى',
}

export const EXPENSE_SOURCE_LABEL: Record<ExpenseSource, string> = {
  drawer: 'من الدرج',
  external: 'من خارج الدرج',
}

export function formatExpenseDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('ar-LY', { day: 'numeric', month: 'short', year: 'numeric' })
}
