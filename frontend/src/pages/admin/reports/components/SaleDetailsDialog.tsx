import { useEffect, useState } from 'react'

import { ApiError } from '../../../../api/errors'
import * as reportsApi from '../../../../api/reports'
import type { SaleDetail } from '../../../../types'
import { formatLyd } from '../../../../utils/money'
import { Alert } from '../../../../shared/ui/Alert'
import { Badge } from '../../../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/dialog'

function formatWhen(value: string) {
  return new Date(value).toLocaleString('ar-LY', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function SaleDetailsDialog({ saleId, onClose }: { saleId: number | null; onClose: () => void }) {
  const [sale, setSale] = useState<SaleDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (saleId === null) return
    let active = true
    void reportsApi.getSaleDetail(saleId)
      .then((data) => { if (active) setSale(data) })
      .catch((err) => { if (active) setError(err instanceof ApiError ? err.message : 'تعذر تحميل تفاصيل الفاتورة') })
    return () => { active = false }
  }, [saleId])

  return (
    <Dialog open={saleId !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>تفاصيل الفاتورة #{saleId}</DialogTitle>
        </DialogHeader>
        {error ? <Alert>{error}</Alert> : null}
        {sale?.id !== saleId && !error ? <p className="text-muted-foreground">جاري تحميل تفاصيل الفاتورة...</p> : null}
        {sale && sale.id === saleId ? (
          <div className="space-y-5">
            <div className="grid gap-3 rounded-xl bg-secondary/50 p-4 text-sm sm:grid-cols-2">
              <p>التاريخ: <strong>{formatWhen(sale.created_at)}</strong></p>
              <p>الكاشير: <strong>{sale.cashier_username}</strong></p>
              <p>الوردية: <strong>#{sale.shift_id}</strong></p>
              <p>طريقة الدفع: <strong>{sale.payment_method === 'cash' ? 'نقدي' : 'بطاقة مصرفية'}</strong></p>
              <p>الحالة: <Badge variant={sale.status === 'cancelled' ? 'destructive' : 'default'}>{sale.status === 'cancelled' ? 'ملغاة' : 'مكتملة'}</Badge></p>
              {sale.cancelled_at ? <p>الإلغاء: <strong>{sale.cancelled_by_username ?? '—'} · {formatWhen(sale.cancelled_at)}</strong></p> : null}
            </div>
            <div className="max-h-[40vh] overflow-auto rounded-xl border border-border sm:max-h-[45vh]" role="region" aria-label="منتجات الفاتورة" tabIndex={0}>
              <table className="w-full min-w-[480px] text-right text-sm">
                <thead className="sticky top-0 z-10 bg-secondary">
                  <tr><th className="p-3">المنتج</th><th className="p-3">الكمية</th><th className="p-3">سعر الوحدة</th><th className="p-3">الإجمالي</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sale.items.map((item) => (
                    <tr key={item.id}>
                      <td className="p-3 font-semibold">{item.product_name}</td>
                      <td className="p-3">{item.qty}</td>
                      <td className="p-3">{formatLyd(item.unit_price_lyd)}</td>
                      <td className="p-3 font-semibold">{formatLyd(item.line_total_lyd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-border pt-4 text-left text-xl font-extrabold text-primary">الإجمالي: {formatLyd(sale.total_lyd)}</p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
