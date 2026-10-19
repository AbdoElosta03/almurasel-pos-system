import type { PaymentMethod, ReportPeriod, ReportStatus, Role } from './common'

export interface LoginRequest {
  username: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  role: Role
}

export interface UserCreate {
  username: string
  password: string
  role: Role
}

export interface UserUpdate {
  password?: string
  role?: Role
  is_active?: boolean
}

export interface CategoryCreate {
  name: string
}

export interface CategoryUpdate {
  name?: string
  is_active?: boolean
}

export interface ProductCreate {
  category_id: number
  name: string
  price_lyd: number
}

export interface ProductUpdate {
  category_id?: number
  name?: string
  price_lyd?: number
  is_active?: boolean
}

export interface ShiftOpen {
  opening_cash_lyd: number
}

export interface ShiftClose {
  closing_cash_lyd: number
}

export interface SaleItemInput {
  product_id: number
  qty: number
}

export interface SaleCreate {
  payment_method: PaymentMethod
  items: SaleItemInput[]
}

export interface ReportSummaryQuery {
  period?: ReportPeriod
  shift_id?: number
}

export interface SalesReportQuery {
  date_from?: string
  date_to?: string
  cashier_id?: number
  shift_id?: number
  status?: ReportStatus
  page?: number
  page_size?: number
}
