import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Banknote, CreditCard, ReceiptText } from 'lucide-react'
import { Link } from 'react-router-dom'

import * as salesApi from '../../../api/sales'
import { ApiError } from '../../../api/errors'
import type { SalePage } from '../../../types'
import { formatLyd } from '../../../utils/money'
import { Alert } from '../../../shared/ui/Alert'
import { LoadingBlock } from '../../../shared/ui/LoadingBlock'
import { Pagination } from '../../../shared/ui/Pagination'
import { Card } from '../../../shared/ui/Card'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { Badge } from '../../../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { tableHeadCellStickyClass, tableHeaderRowClass, tableScrollContainerClass } from '../../../shared/lib/tableScroll'

const PAGE_SIZE = 10

function formatWhen(value: string) {
  return new Date(value).toLocaleString('ar-LY', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function InvoiceLink({ saleId, children }: { saleId: number; children: ReactNode }) {
  return (
    <Link
      to={`/cashier/invoices/${saleId}`}
      aria-label={`عرض تفاصيل الفاتورة رقم ${saleId}`}
      className="-mx-5 -my-5 block px-5 py-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
    >
      {children}
    </Link>
  )
}

export function CashierInvoicesPage() {
  const [report, setReport] = useState<SalePage | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (nextPage: number) => {
    setLoading(true)
    setError(null)
    try {
      setReport(await salesApi.listMyOpenShiftSales(nextPage, PAGE_SIZE))
    } catch (err) {
      setReport(null)
      setError(err instanceof ApiError ? err.message : 'تعذر تحميل الفواتير')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(page)
  }, [load, page])

  return (
    <div className="mx-auto w-full max-w-6xl space-y-3">
      <div className="border-b border-border/40 pb-3">
        <PageHeader title="الفواتير" description="فواتير ورديتك المفتوحة، من الأحدث إلى الأقدم." />
      </div>
      {loading ? <LoadingBlock /> : null}
      {error ? <Alert>{error}</Alert> : null}
      {!loading && report ? (
        <Card className="grid grid-cols-3 divide-x divide-border p-0">
          <div className="flex min-w-0 items-center gap-2 p-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
              <ReceiptText className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">عدد الفواتير</p>
              <p className="truncate text-base font-extrabold">{report.summary.invoice_count}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2 p-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
              <Banknote className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">مبيعات نقدية</p>
              <p className="truncate text-base font-extrabold">{formatLyd(report.summary.cash_lyd)}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2 p-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
              <CreditCard className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">مبيعات بطاقة</p>
              <p className="truncate text-base font-extrabold">{formatLyd(report.summary.card_lyd)}</p>
            </div>
          </div>
        </Card>
      ) : null}
      {!loading && !error && report?.items.length === 0 ? (
        <Card className="text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary">
            <ReceiptText className="size-8" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-xl font-bold">لا توجد فواتير بعد</h3>
          <p className="mx-auto mt-2 max-w-md text-base text-muted-foreground">ستظهر هنا فواتير المبيعات عند إتمامها.</p>
        </Card>
      ) : null}
      {!loading && report && report.items.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <Table
            className="min-w-[730px]"
            containerClassName={tableScrollContainerClass(report.items.length)}
          >
            <TableHeader className={tableHeaderRowClass(report.items.length, true)}>
              <TableRow className="hover:bg-secondary/60">
                {['رقم الفاتورة', 'الوقت', 'طريقة الدفع', 'الأصناف', 'الإجمالي', 'الحالة'].map((label) => (
                  <TableHead key={label} className={tableHeadCellStickyClass(report.items.length)}>{label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.items.map((sale) => {
                const cancelled = sale.status === 'cancelled'
                return (
                  <TableRow
                    key={sale.id}
                    className={cancelled ? 'bg-red-50/50 hover:bg-red-50' : ''}
                  >
                    <TableCell className="font-extrabold"><InvoiceLink saleId={sale.id}>#{sale.id}</InvoiceLink></TableCell>
                    <TableCell className="text-muted-foreground"><InvoiceLink saleId={sale.id}>{formatWhen(sale.created_at)}</InvoiceLink></TableCell>
                    <TableCell><InvoiceLink saleId={sale.id}>{sale.payment_method === 'cash' ? 'نقدي' : 'بطاقة مصرفية'}</InvoiceLink></TableCell>
                    <TableCell><InvoiceLink saleId={sale.id}>{sale.item_count}</InvoiceLink></TableCell>
                    <TableCell className="font-extrabold"><InvoiceLink saleId={sale.id}>{formatLyd(sale.total_lyd)}</InvoiceLink></TableCell>
                    <TableCell><InvoiceLink saleId={sale.id}><Badge variant={cancelled ? 'destructive' : 'default'}>{cancelled ? 'ملغاة' : 'مكتملة'}</Badge></InvoiceLink></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <Pagination page={report.page} pageSize={report.page_size} total={report.total} onPageChange={setPage} />
        </Card>
      ) : null}
    </div>
  )
}
