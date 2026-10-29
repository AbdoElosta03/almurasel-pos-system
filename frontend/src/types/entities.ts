import type { DailyClosingResult, PaymentMethod, Role, SaleStatus, ShiftStatus } from './common'

export interface User {
  id: number
  username: string
  role: Role
  is_active: boolean
}

export interface LoginAccount {
  username: string
  role: Role
}

export interface Category {
  id: number
  name: string
  is_active: boolean
}

export interface Product {
  id: number
  category_id: number
  name: string
  price_lyd: number
  is_active: boolean
  image_url: string | null
}

export interface Shift {
  id: number
  cashier_id: number
  status: ShiftStatus
  opening_cash_lyd: number
  closing_cash_lyd: number | null
  opened_at: string
  closed_at: string | null
}

export interface DailyClosing {
  shift_id: number
  cashier_id: number
  cashier_username: string
  status: ShiftStatus
  opened_at: string
  closed_at: string | null
  opening_cash_lyd: number
  closing_cash_lyd: number | null
  sales_total_lyd: number
  cash_sales_lyd: number
  card_sales_lyd: number
  expected_drawer_lyd: number
  counted_cash_lyd: number | null
  variance_lyd: number | null
  result: DailyClosingResult
  reconciled_at: string | null
}

export interface DailyClosingList {
  date: string
  items: DailyClosing[]
}

export interface SaleItem {
  id: number
  product_id: number
  product_name: string
  unit_price_lyd: number
  qty: number
  line_total_lyd: number
}

export interface Sale {
  id: number
  shift_id: number
  cashier_id: number
  payment_method: PaymentMethod
  status: SaleStatus
  total_lyd: number
  created_at: string
  cancelled_at: string | null
  cancelled_by: number | null
  items: SaleItem[]
}

export interface PurchaseItem {
  id: number
  item_name: string
  qty: number
  line_total_lyd: number
}

export interface PurchaseSummary {
  id: number
  purchase_date: string
  supplier_name: string | null
  total_lyd: number
  created_by: number
  created_at: string
}

export interface Purchase extends PurchaseSummary {
  items: PurchaseItem[]
}

export interface SalePage {
  summary: OpenShiftSalesSummary
  items: SaleSummary[]
  page: number
  page_size: number
  total: number
}

export interface SaleSummary {
  id: number
  payment_method: PaymentMethod
  status: SaleStatus
  total_lyd: number
  created_at: string
  item_count: number
}

export interface OpenShiftSalesSummary {
  invoice_count: number
  cash_lyd: number
  card_lyd: number
}

export interface SaleDetail extends Sale {
  cashier_username: string
  cancelled_by_username: string | null
}

export interface ReportSummary {
  count: number
  total_lyd: number
  cash_lyd: number
  card_lyd: number
}

export interface SalesReportSummary extends ReportSummary {
  cancelled_count: number
  cancelled_lyd: number
}

export interface SalesReportItem {
  id: number
  created_at: string
  cashier_id: number
  cashier_username: string
  shift_id: number
  payment_method: PaymentMethod
  status: SaleStatus
  total_lyd: number
  cancelled_at: string | null
  cancelled_by: number | null
  cancelled_by_username: string | null
}

export interface SalesReport {
  summary: SalesReportSummary
  items: SalesReportItem[]
  page: number
  page_size: number
  total: number
}

export interface WeeklySalesDay {
  weekday: number
  label: string
  total_lyd: number
  count: number
}

export interface WeeklySalesInsights {
  best_days: string[]
  hour_from: number | null
  hour_to: number | null
  summary: string
}

export interface WeeklySales {
  week_start: string
  week_end: string
  week_offset: number
  days: WeeklySalesDay[]
  insights: WeeklySalesInsights
}

export interface DailyProductSalesItem {
  product_id: number
  product_name: string
  qty: number
  total_lyd: number
}

export interface DailyProductSales {
  date: string
  day_offset: number
  items: DailyProductSalesItem[]
  total_qty: number
}

export interface AuditLog {
  id: number
  actor_id: number
  action: string
  entity_type: string
  entity_id: number
  created_at: string
}
