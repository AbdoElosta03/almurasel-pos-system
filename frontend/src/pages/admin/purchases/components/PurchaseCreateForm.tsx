import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import { ApiError } from '../../../../api/errors'
import type { PurchaseCreate } from '../../../../types'
import { formatLyd } from '../../../../utils/money'
import { Alert } from '../../../../shared/ui/Alert'
import { Button } from '../../../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/dialog'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'

interface DraftItem {
  id: number
  name: string
  qty: string
  amount: string
}

type ItemFields = Omit<DraftItem, 'id'>
const emptyItem = (): ItemFields => ({ name: '', qty: '1', amount: '' })

function today() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const decimalPattern = /^\d+(?:[.,]\d{1,3})?$/
const parseAmount = (value: string) => Number(value.replace(',', '.'))

export function PurchaseCreateForm({ onCreate }: { onCreate: (body: PurchaseCreate) => Promise<void> }) {
  const nextId = useRef(1)
  const [purchaseDate, setPurchaseDate] = useState(today)
  const [supplier, setSupplier] = useState('')
  const [items, setItems] = useState<DraftItem[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [draft, setDraft] = useState<ItemFields>(emptyItem)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openNewItem = () => {
    setEditingId(null)
    setDraft(emptyItem())
    setItemDialogOpen(true)
  }

  const openEditItem = (item: DraftItem) => {
    setEditingId(item.id)
    setDraft({ name: item.name, qty: item.qty, amount: item.amount })
    setItemDialogOpen(true)
  }

  const validItem = draft.name.trim().length > 0 && decimalPattern.test(draft.qty.trim()) && parseAmount(draft.qty) > 0 &&
    decimalPattern.test(draft.amount.trim()) && parseAmount(draft.amount) >= 0

  const saveItem = (event: FormEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (!validItem) return
    const value = { name: draft.name.trim(), qty: draft.qty.trim(), amount: draft.amount.trim() }
    if (editingId === null) {
      setItems((current) => [...current, { id: nextId.current++, ...value }])
    } else {
      setItems((current) => current.map((item) => item.id === editingId ? { ...item, ...value } : item))
    }
    setItemDialogOpen(false)
  }

  const valid = Boolean(purchaseDate) && items.length > 0 && items.every((item) =>
    item.name.trim().length > 0 && decimalPattern.test(item.qty.trim()) && parseAmount(item.qty) > 0 &&
    decimalPattern.test(item.amount.trim()) && parseAmount(item.amount) >= 0,
  )
  const previewTotal = items.reduce(
    (sum, item) => sum + (decimalPattern.test(item.amount.trim()) ? Math.round(parseAmount(item.amount) * 1000) : 0),
    0,
  ) / 1000

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    try {
      await onCreate({
        purchase_date: purchaseDate,
        supplier_name: supplier.trim() || null,
        items: items.map((item) => ({ item_name: item.name.trim(), qty: parseAmount(item.qty), line_total_lyd: parseAmount(item.amount) })),
      })
      setPurchaseDate(today())
      setSupplier('')
      setItems([])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر حفظ فاتورة المشتريات')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="purchase-date">تاريخ الشراء</Label>
            <Input id="purchase-date" type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} required disabled={busy} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchase-supplier">المورد (اختياري)</Label>
            <Input id="purchase-supplier" value={supplier} onChange={(event) => setSupplier(event.target.value)} maxLength={120} placeholder="اسم المحل أو المورد" disabled={busy} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold">عناصر المشتريات</h3>
            <Button type="button" variant="outline" size="sm" onClick={openNewItem} disabled={busy}>
              <Plus className="size-4" /> إضافة عنصر
            </Button>
          </div>
          {items.length === 0 ? <p className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">لم تُضف أي مواد بعد</p> : null}
          <div className="grid max-h-[30rem] auto-rows-[9.5rem] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <div key={item.id} className="min-w-0 rounded-xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-muted-foreground">عنصر {index + 1}</span>
                    <h4 className="line-clamp-2 break-words font-bold" title={item.name}>{item.name}</h4>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" variant="ghost" size="sm" aria-label={`تعديل ${item.name}`} onClick={() => openEditItem(item)} disabled={busy}><Pencil className="size-4" /></Button>
                    <Button type="button" variant="ghost" size="sm" aria-label={`حذف ${item.name}`} onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} disabled={busy} className="text-red-700 hover:text-red-800"><Trash2 className="size-4" /></Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
                  <span>الكمية: <strong>{item.qty}</strong></span>
                  <span>السعر الإجمالي: <strong className="text-primary">{formatLyd(parseAmount(item.amount))}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-lg font-extrabold">إجمالي الفاتورة: <span className="text-primary">{formatLyd(previewTotal)}</span></p>
        <Button type="submit" size="lg" loading={busy} disabled={!valid}>حفظ الفاتورة</Button>
      </div>
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{editingId === null ? 'إضافة عنصر' : 'تعديل عنصر'}</DialogTitle></DialogHeader>
          <form onSubmit={saveItem} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="purchase-item-name">اسم المادة</Label>
              <Input id="purchase-item-name" autoFocus value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} maxLength={120} placeholder="بن (كيلو) أو صندوق حليب" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="purchase-item-qty">الكمية</Label>
                <Input id="purchase-item-qty" inputMode="decimal" value={draft.qty} onChange={(event) => setDraft((current) => ({ ...current, qty: event.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase-item-amount">السعر الإجمالي (د.ل)</Label>
                <Input id="purchase-item-amount" inputMode="decimal" value={draft.amount} onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))} placeholder="مثال: 87" required />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={!validItem}>{editingId === null ? 'إضافة العنصر' : 'حفظ التعديل'}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </form>
  )
}
