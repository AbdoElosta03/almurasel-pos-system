import type { DailyProductSales, ReportSummary, ReportSummaryQuery, SaleDetail, SalesReport, SalesReportQuery, WeeklySales } from '../types'
import { apiGet } from './client'

export function reportSummary(params: ReportSummaryQuery) {
  return apiGet<ReportSummary>('/reports/summary', { params })
}

export function salesReport(params: SalesReportQuery) {
  return apiGet<SalesReport>('/reports/sales', { params })
}

export function weeklySales(weekOffset: number) {
  return apiGet<WeeklySales>('/reports/weekly-sales', { params: { week_offset: weekOffset } })
}

export function dailyProductSales(day: number | string) {
  return apiGet<DailyProductSales>('/reports/daily-product-sales', {
    params: typeof day === 'string' ? { date: day } : { day_offset: day },
  })
}

export function getSaleDetail(saleId: number) {
  return apiGet<SaleDetail>(`/reports/sales/${saleId}`)
}
