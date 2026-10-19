export type Role = 'admin' | 'cashier'
export type PaymentMethod = 'cash' | 'card'
export type SaleStatus = 'completed' | 'cancelled'
export type ShiftStatus = 'open' | 'closed'
export type ReportPeriod = 'day' | 'week' | 'month'
export type ReportStatus = 'all' | 'completed' | 'cancelled'

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}
