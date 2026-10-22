import type { SalesReport } from '../../../../types'
import { formatLyd } from '../../../../utils/money'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { tableHeadCellStickyClass, tableHeaderRowClass, tableScrollContainerClass } from '../../../../shared/lib/tableScroll'

function formatWhen(value: string) {
  return new Date(value).toLocaleString('ar-LY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SalesReportTable({
  report,
  onPageChange,
  onViewSale,
}: {
  report: SalesReport
  onPageChange: (page: number) => void
  onViewSale: (saleId: number) => void
}) {
  const pages = Math.max(1, Math.ceil(report.total / report.page_size))
  const itemCount = report.items.length
  const stickyHead = tableHeadCellStickyClass(itemCount)

  if (report.items.length === 0) {
    return (
      <div className="border-t border-dashed border-border p-10 text-center text-muted-foreground">
        <p className="text-xl font-extrabold text-foreground">لا توجد فواتير في هذه الفترة</p>
      </div>
    )
  }

  return (
    <>
        <Table className="min-w-[1050px]" containerClassName={tableScrollContainerClass(itemCount)}>
          <TableHeader className={tableHeaderRowClass(itemCount, true)}>
            <TableRow className="hover:bg-secondary/60">
              <TableHead className={stickyHead}>رقم الفاتورة</TableHead>
              <TableHead className={stickyHead}>التاريخ والوقت</TableHead>
              <TableHead className={stickyHead}>المستخدم</TableHead>
              <TableHead className={stickyHead}>الوردية</TableHead>
              <TableHead className={stickyHead}>طريقة الدفع</TableHead>
              <TableHead className={stickyHead}>المبلغ</TableHead>
              <TableHead className={stickyHead}>الحالة</TableHead>
              <TableHead className={stickyHead}>تفاصيل الإلغاء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.items.map((sale) => {
              const cancelled = sale.status === 'cancelled'
              return (
                <TableRow
                  key={sale.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`عرض تفاصيل الفاتورة رقم ${sale.id}`}
                  onClick={() => onViewSale(sale.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onViewSale(sale.id)
                    }
                  }}
                  className={`cursor-pointer focus-visible:outline-2 focus-visible:outline-primary ${cancelled ? 'bg-red-50/50 hover:bg-red-50' : ''}`}
                >
                  <TableCell className="text-lg font-extrabold text-foreground">#{sale.id}</TableCell>
                  <TableCell className="text-muted-foreground">{formatWhen(sale.created_at)}</TableCell>
                  <TableCell className="font-bold text-foreground">{sale.cashier_username}</TableCell>
                  <TableCell className="text-muted-foreground">#{sale.shift_id}</TableCell>
                  <TableCell>{sale.payment_method === 'cash' ? 'نقدي' : 'بطاقة مصرفية'}</TableCell>
                  <TableCell className="text-lg font-extrabold text-foreground">{formatLyd(sale.total_lyd)}</TableCell>
                  <TableCell>
                    <Badge className="px-3 py-1.5 text-base" variant={cancelled ? 'destructive' : 'default'}>
                      {cancelled ? 'ملغاة' : 'مكتملة'}
                    </Badge>
                  </TableCell>
                  <TableCell className={cancelled ? 'text-red-700' : 'text-muted-foreground'}>
                    {cancelled
                      ? `${sale.cancelled_by_username ?? '—'} · ${sale.cancelled_at ? formatWhen(sale.cancelled_at) : '—'}`
                      : '—'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      <div className="flex flex-col gap-3 border-t border-border bg-card px-5 py-4 sm:flex-row sm:justify-between sm:px-6">
        <p className="text-sm text-muted-foreground">
          صفحة {report.page} من {pages} · {report.total} فاتورة
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={report.page <= 1} onClick={() => onPageChange(report.page - 1)}>
            السابق
          </Button>
          <Button type="button" variant="outline" disabled={report.page >= pages} onClick={() => onPageChange(report.page + 1)}>
            التالي
          </Button>
        </div>
      </div>
    </>
  )
}
