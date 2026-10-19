import type { ReportSummary, ReportSummaryQuery, SaleDetail, SalesReport, SalesReportQuery } from '../types'
import { apiGet } from './client'

export function reportSummary(params: ReportSummaryQuery) {
  return apiGet<ReportSummary>('/reports/summary', { params })
}

export function salesReport(params: SalesReportQuery) {
  return apiGet<SalesReport>('/reports/sales', { params })
}

export function getSaleDetail(saleId: number) {
  return apiGet<SaleDetail>(`/reports/sales/${saleId}`)
}
