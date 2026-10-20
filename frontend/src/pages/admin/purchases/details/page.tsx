import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'

import * as purchasesApi from '../../../../api/purchases'
import { ApiError } from '../../../../api/errors'
import type { Purchase } from '../../../../types'
import { formatLyd } from '../../../../utils/money'
import { Alert } from '../../../../shared/ui/Alert'
import { ConfirmDialog } from '../../../../shared/ui/ConfirmDialog'
import { LoadingBlock } from '../../../../shared/ui/LoadingBlock'
import { Button } from '../../../../components/ui/button'
import { Card } from '../../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('ar-LY', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function PurchaseDetailsPage() {
  const { purchaseId } = useParams()
  const navigate = useNavigate()
  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const id = Number(purchaseId)
    setPurchase(null)
    setError(null)
    if (!purchaseId || !/^\d+$/.test(purchaseId) || !Number.isSafeInteger(id) || id < 1) {
      setError('فاتورة المشتريات غير موجودة')
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    void purchasesApi.getPurchase(id)
      .then((result) => { if (active) setPurchase(result) })
      .catch((err) => { if (active) setError(err instanceof ApiError ? err.message : 'تعذر تحميل تفاصيل الفاتورة') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [purchaseId])

  const deletePurchase = async () => {
    if (!purchase || deleting) return
    setDeleting(true)
    setError(null)
    try {
      await purchasesApi.deletePurchase(purchase.id)
      navigate('/admin/purchases', { replace: true, state: { deletedId: purchase.id } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر حذف فاتورة المشتريات')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold sm:text-2xl">تفاصيل فاتورة المشتريات #{purchaseId}</h1>
        {purchase ? <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)}><Trash2 className="size-4" /> حذف الفاتورة</Button> : null}
      </div>
      {loading ? <LoadingBlock /> : null}
      {error ? <Alert>{error}</Alert> : null}
      {!loading && purchase ? (
        <>
          <Card className="grid gap-4 p-5 sm:grid-cols-3">
            <p>تاريخ الشراء: <strong>{formatDate(purchase.purchase_date)}</strong></p>
            <p>المورد: <strong>{purchase.supplier_name ?? 'غير محدد'}</strong></p>
            <p>عدد العناصر: <strong>{purchase.items.length}</strong></p>
          </Card>
          <Card className="overflow-hidden p-0">
            <div className={purchase.items.length > 6 ? 'max-h-[27.5rem] overflow-y-auto' : ''} role="region" aria-label="عناصر فاتورة المشتريات" tabIndex={purchase.items.length > 6 ? 0 : undefined}>
              <Table className="min-w-[550px]">
                <TableHeader className="bg-secondary/60">
                  <TableRow><TableHead>المادة</TableHead><TableHead>الكمية</TableHead><TableHead>السعر الإجمالي</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {purchase.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-[36rem] whitespace-normal break-words font-bold">{item.item_name}</TableCell>
                      <TableCell>{item.qty}</TableCell>
                      <TableCell className="font-bold">{formatLyd(item.line_total_lyd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="border-t border-border p-5 text-left text-xl font-extrabold text-primary">
              الإجمالي: {formatLyd(purchase.total_lyd)}
            </div>
          </Card>
        </>
      ) : null}
      <ConfirmDialog
        open={confirmDelete}
        title="حذف فاتورة المشتريات"
        description={purchase ? `هل تريد حذف الفاتورة #${purchase.id} وجميع عناصرها نهائياً؟ لا يمكن التراجع عن هذا الإجراء.` : ''}
        confirmLabel="تأكيد الحذف"
        confirmVariant="destructive"
        busy={deleting}
        onConfirm={() => void deletePurchase()}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}
