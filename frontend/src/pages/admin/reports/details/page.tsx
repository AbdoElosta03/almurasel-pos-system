import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { ApiError } from '../../../../api/errors'
import * as reportsApi from '../../../../api/reports'
import type { SaleDetail } from '../../../../types'
import { formatLyd } from '../../../../utils/money'
import { Alert } from '../../../../shared/ui/Alert'
import { LoadingBlock } from '../../../../shared/ui/LoadingBlock'
import { Badge } from '../../../../components/ui/badge'
import { Card } from '../../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'

function formatWhen(value: string) {
  return new Date(value).toLocaleString('ar-LY', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function AdminSaleDetailsPage() {
  const { saleId } = useParams()
  const [sale, setSale] = useState<SaleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = Number(saleId)
    setSale(null)
    setError(null)
    if (!saleId || !/^\d+$/.test(saleId) || !Number.isSafeInteger(id) || id < 1) {
      setError('الفاتورة غير موجودة')
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    void reportsApi.getSaleDetail(id)
      .then((result) => { if (active) setSale(result) })
      .catch((err) => { if (active) setError(err instanceof ApiError ? err.message : 'تعذر تحميل تفاصيل الفاتورة') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [saleId])

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <h1 className="text-xl font-extrabold sm:text-2xl">تفاصيل الفاتورة #{saleId}</h1>
      {loading ? <LoadingBlock /> : null}
      {error ? <Alert>{error}</Alert> : null}
      {!loading && sale ? (
        <>
          <Card className="grid gap-4 p-5 sm:grid-cols-2">
            <p>التاريخ: <strong>{formatWhen(sale.created_at)}</strong></p>
            <p>الكاشير: <strong>{sale.cashier_username}</strong></p>
            <p>الوردية: <strong>#{sale.shift_id}</strong></p>
            <p>طريقة الدفع: <strong>{sale.payment_method === 'cash' ? 'نقدي' : 'بطاقة مصرفية'}</strong></p>
            <p>الحالة: <Badge variant={sale.status === 'cancelled' ? 'destructive' : 'default'}>{sale.status === 'cancelled' ? 'ملغاة' : 'مكتملة'}</Badge></p>
            {sale.cancelled_at ? <p>الإلغاء: <strong>{sale.cancelled_by_username ?? '—'} · {formatWhen(sale.cancelled_at)}</strong></p> : null}
          </Card>
          <Card className="overflow-hidden p-0">
            <Table className="min-w-[650px]">
              <TableHeader className="bg-secondary/60">
                <TableRow><TableHead>المنتج</TableHead><TableHead>الكمية</TableHead><TableHead>سعر الوحدة</TableHead><TableHead>الإجمالي</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[36rem] whitespace-normal break-words font-bold">{item.product_name}</TableCell>
                    <TableCell>{item.qty}</TableCell>
                    <TableCell>{formatLyd(item.unit_price_lyd)}</TableCell>
                    <TableCell className="font-bold">{formatLyd(item.line_total_lyd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-border p-5 text-left text-xl font-extrabold text-primary">
              الإجمالي: {formatLyd(sale.total_lyd)}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  )
}
