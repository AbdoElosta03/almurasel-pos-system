import { useCallback, useEffect, useState } from 'react'
import { Plus, ReceiptText } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import * as purchasesApi from '../../../api/purchases'
import { ApiError } from '../../../api/errors'
import type { PurchaseSummary } from '../../../types'
import type { PaginatedResult } from '../../../types/common'
import { formatLyd } from '../../../utils/money'
import { Alert } from '../../../shared/ui/Alert'
import { LoadingBlock } from '../../../shared/ui/LoadingBlock'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { Pagination } from '../../../shared/ui/Pagination'
import { Toast, type ToastMessage } from '../../../shared/ui/Toast'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'

const PAGE_SIZE = 10

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('ar-LY', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function PurchasesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [report, setReport] = useState<PaginatedResult<PurchaseSummary> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(() => {
    const state = location.state as { createdId?: number; deletedId?: number } | null
    if (state?.createdId) return { tone: 'success', text: `تم إنشاء فاتورة المشتريات #${state.createdId}` }
    if (state?.deletedId) return { tone: 'success', text: `تم حذف فاتورة المشتريات #${state.deletedId}` }
    return null
  })

  useEffect(() => {
    const state = location.state as { createdId?: number; deletedId?: number } | null
    if (state?.createdId || state?.deletedId) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  const load = useCallback(async (nextPage: number) => {
    setLoading(true)
    setError(null)
    try {
      setReport(await purchasesApi.listPurchases(nextPage, PAGE_SIZE))
    } catch (err) {
      setReport(null)
      setError(err instanceof ApiError ? err.message : 'تعذر تحميل فواتير المشتريات')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(page) }, [load, page])

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <PageHeader title="المشتريات" description="سجّل مشتريات المحل وراجع فواتيرها." />
        <Button size="lg" asChild><Link to="/admin/purchases/new"><Plus className="size-5" /> فاتورة جديدة</Link></Button>
      </div>

      {error ? <Alert>{error}</Alert> : null}
      {loading ? <LoadingBlock /> : null}
      {!loading && !error && report?.items.length === 0 ? (
        <Card className="items-center gap-3 p-10 text-center">
          <ReceiptText className="size-12 text-primary" aria-hidden="true" />
          <h3 className="text-xl font-bold">لا توجد فواتير مشتريات بعد</h3>
          <p className="text-muted-foreground">اضغط «فاتورة جديدة» لتسجيل أول عملية شراء.</p>
        </Card>
      ) : null}
      {!loading && report && report.items.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <Table className="min-w-[650px]">
            <TableHeader className="bg-secondary/60">
              <TableRow className="hover:bg-secondary/60"><TableHead>رقم الفاتورة</TableHead><TableHead>تاريخ الشراء</TableHead><TableHead>المورد</TableHead><TableHead>الإجمالي</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {report.items.map((purchase) => (
                <TableRow
                  key={purchase.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`عرض تفاصيل فاتورة المشتريات رقم ${purchase.id}`}
                  className="cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
                  onClick={() => navigate(`/admin/purchases/${purchase.id}`)}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/admin/purchases/${purchase.id}`) } }}
                >
                  <TableCell className="font-extrabold">#{purchase.id}</TableCell>
                  <TableCell>{formatDate(purchase.purchase_date)}</TableCell>
                  <TableCell>{purchase.supplier_name ?? 'غير محدد'}</TableCell>
                  <TableCell className="font-extrabold text-primary">{formatLyd(purchase.total_lyd)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={report.page} pageSize={report.page_size} total={report.total} onPageChange={setPage} />
        </Card>
      ) : null}

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}
