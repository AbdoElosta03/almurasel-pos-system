export type Role = 'admin' | 'cashier'
export type PaymentMethod = 'cash' | 'card'
export type SaleStatus = 'completed' | 'cancelled'
export type ShiftStatus = 'open' | 'closed'
export type ReportPeriod = 'day' | 'week' | 'month'
export type ReportStatus = 'all' | 'completed' | 'cancelled'
export type DailyClosingResult = 'open' | 'pending' | 'surplus' | 'deficit' | 'match'
export type ExpenseCategory = 'wage' | 'supplier_payment' | 'other'
export type ExpenseSource = 'drawer' | 'external'
export type LicensePlan = 'two_days' | 'week' | 'month' | 'lifetime' | 'development'
export type LicenseLockReason = 'license_required' | 'license_expired' | 'clock_tampered'

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}
