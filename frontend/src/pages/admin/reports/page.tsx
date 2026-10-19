import { useCallback, useEffect, useState } from 'react'

import { ApiError } from '../../../api/errors'
import * as reportsApi from '../../../api/reports'
import * as usersApi from '../../../api/users'
import type { ReportStatus, SalesReport, SalesReportQuery, User } from '../../../types'
import { Alert } from '../../../shared/ui/Alert'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { Card, CardContent } from '../../../components/ui/card'
import { ReportFilters } from './components/ReportFilters'
import { ReportSummaryCards } from './components/ReportSummaryCards'
import { SaleDetailsDialog } from './components/SaleDetailsDialog'
import { SalesReportTable } from './components/SalesReportTable'

const PAGE_SIZE = 20

function isoDate(value: Date) {
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${value.getFullYear()}-${month}-${day}`
}

const today = isoDate(new Date())

export function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [cashierId, setCashierId] = useState('')
  const [shiftId, setShiftId] = useState('')
  const [status, setStatus] = useState<ReportStatus>('all')
  const [users, setUsers] = useState<User[]>([])
  const [query, setQuery] = useState<SalesReportQuery>({
    date_from: today,
    date_to: today,
    status: 'all',
    page: 1,
    page_size: PAGE_SIZE,
  })
  const [report, setReport] = useState<SalesReport | null>(null)
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void usersApi.listUsers().then(setUsers).catch(() => setUsers([]))
  }, [])

  const load = useCallback(async (next: SalesReportQuery) => {
    setLoading(true)
    setError(null)
    try {
      setReport(await reportsApi.salesReport(next))
    } catch (err) {
      setReport(null)
      setError(err instanceof ApiError ? err.message : 'تعذر تحميل التقرير')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(query)
  }, [load, query])

  const apply = (page = 1) => {
    const shift = shiftId.trim()
    if (!shift && dateFrom && dateTo && dateFrom > dateTo) {
      setError('تاريخ البداية يجب أن يسبق تاريخ النهاية أو يساويه')
      return
    }
    const next: SalesReportQuery = { status, page, page_size: PAGE_SIZE }
    if (shift) {
      next.shift_id = Number(shift)
    } else {
      next.date_from = dateFrom
      next.date_to = dateTo
      if (cashierId) next.cashier_id = Number(cashierId)
    }
    setQuery(next)
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-7 sm:w-[calc(100%-2rem)]">
      <div className="border-b border-border/60 pb-2">
        <PageHeader title="التقارير" description="مبيعات الفترة حسب المستخدم أو الوردية. الإجمالي للمكتملة، والملغاة ظاهرة بشكل منفصل." />
      </div>
      {report ? <ReportSummaryCards summary={report.summary} /> : null}
      {error ? <Alert>{error}</Alert> : null}
      <Card className="overflow-hidden rounded-2xl shadow-[0_12px_35px_-28px_rgba(18,83,78,.35)]">
        <CardContent className="border-b border-border !p-4">
          <ReportFilters
            dateFrom={dateFrom}
            dateTo={dateTo}
            cashierId={cashierId}
            shiftId={shiftId}
            status={status}
            users={users}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onCashierChange={setCashierId}
            onShiftIdChange={setShiftId}
            onStatusChange={setStatus}
            onApply={() => apply(1)}
          />
        </CardContent>
        {loading ? <p className="p-6 text-base text-muted-foreground">جاري التحميل...</p> : null}
        {report ? (
          <SalesReportTable
            report={report}
            onPageChange={(page) => setQuery((current) => ({ ...current, page }))}
            onViewSale={setSelectedSaleId}
          />
        ) : null}
      </Card>
      <SaleDetailsDialog key={selectedSaleId ?? 'closed'} saleId={selectedSaleId} onClose={() => setSelectedSaleId(null)} />
    </div>
  )
}
