import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Ban } from 'lucide-react'

import * as salesApi from '../../../../api/sales'
import { ApiError } from '../../../../api/errors'
import type { Sale } from '../../../../types'
import { formatLyd } from '../../../../utils/money'
import { Alert } from '../../../../shared/ui/Alert'
import { ConfirmDialog } from '../../../../shared/ui/ConfirmDialog'
import { LoadingBlock } from '../../../../shared/ui/LoadingBlock'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Card } from '../../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'

function formatWhen(value: string) {
  return new Date(value).toLocaleString('ar-LY', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function CashierInvoiceDetailsPage() {
  const { saleId } = useParams()
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)

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
    void salesApi.getMyOpenShiftSale(id)
      .then((result) => { if (active) setSale(result) })
      .catch((err) => { if (active) setError(err instanceof ApiError ? err.message : 'تعذر تحميل تفاصيل الفاتورة') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [saleId])

  const cancelSale = async () => {
    if (!sale || sale.status === 'cancelled' || cancelling) return
    setCancelling(true)
    setError(null)
    try {
      setSale(await salesApi.cancelSale(sale.id))
      setConfirmCancel(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر إلغاء الفاتورة')
      setConfirmCancel(false)
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold sm:text-2xl">تفاصيل الفاتورة #{saleId}</h1>
        {sale?.status === 'completed' ? (
          <Button type="button" variant="destructive" onClick={() => setConfirmCancel(true)}>
            <Ban className="size-4" /> إلغاء الفاتورة
          </Button>
        ) : null}
      </div>
      {loading ? <LoadingBlock /> : null}
      {error ? <Alert>{error}</Alert> : null}
      {!loading && sale ? (
        <>
          <Card className="grid gap-4 p-5 sm:grid-cols-2">
            <p>التاريخ: <strong>{formatWhen(sale.created_at)}</strong></p>
            <p>طريقة الدفع: <strong>{sale.payment_method === 'cash' ? 'نقدي' : 'بطاقة مصرفية'}</strong></p>
            <p>الحالة: <Badge variant={sale.status === 'cancelled' ? 'destructive' : 'default'}>{sale.status === 'cancelled' ? 'ملغاة' : 'مكتملة'}</Badge></p>
            {sale.cancelled_at ? <p>وقت الإلغاء: <strong>{formatWhen(sale.cancelled_at)}</strong></p> : null}
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
      <ConfirmDialog
        open={confirmCancel}
        title="إلغاء الفاتورة"
        description={sale ? `سيتم إلغاء فاتورة #${sale.id} بمبلغ ${formatLyd(sale.total_lyd)}. لا يمكن التراجع عن هذا الإجراء.` : ''}
        confirmLabel="تأكيد الإلغاء"
        confirmVariant="destructive"
        busy={cancelling}
        onConfirm={() => void cancelSale()}
        onClose={() => setConfirmCancel(false)}
      />
    </div>
  )
}
