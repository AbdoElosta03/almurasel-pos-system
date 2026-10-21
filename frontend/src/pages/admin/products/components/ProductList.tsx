import { useState } from 'react'
import { Folder, ImageOff, ImagePlus, Layers3, Tag, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'

import type { Category, Product } from '../../../../types'
import { formatLyd } from '../../../../utils/money'
import { productDisplayImage } from '../../../../utils/productImage'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Card } from '../../../../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/dialog'
import { ConfirmDialog } from '../../../../shared/ui/ConfirmDialog'
import { Pagination } from '../../../../shared/ui/Pagination'

export function ProductList({
  products,
  categories,
  startIndex = 0,
  page,
  pageSize,
  total,
  onPageChange,
  onToggle,
  onImage,
  onRemoveImage,
  onDelete,
}: {
  products: Product[]
  categories: Category[]
  startIndex?: number
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onToggle: (product: Product) => Promise<void>
  onImage: (product: Product, image: File) => Promise<void>
  onRemoveImage: (product: Product) => Promise<void>
  onDelete: (product: Product) => Promise<void>
}) {
  const [selected, setSelected] = useState<Product | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null)
  const [busyAction, setBusyAction] = useState<'toggle' | 'image' | 'remove-image' | null>(null)
  const [deleting, setDeleting] = useState(false)

  if (products.length === 0) {
    return (
      <Card className="rounded-[2rem] border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
        <div className="flex flex-col items-center justify-center space-y-4">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary"><Layers3 className="size-8" /></span>
          <div>
            <p className="text-xl font-extrabold text-foreground">لا توجد منتجات مسجلة</p>
            <p className="mt-1 text-sm">اضغط على زر إضافة منتج جديد بالأعلى لبدء القائمة.</p>
          </div>
        </div>
      </Card>
    )
  }

  const categoryMap = new Map(categories.map((category) => [category.id, category.name]))
  const categoryName = selected ? categoryMap.get(selected.category_id) ?? 'غير مصنف' : ''
  const isBusy = busyAction !== null

  const runAction = async (action: 'toggle' | 'image' | 'remove-image', callback: () => Promise<void>) => {
    setBusyAction(action)
    try {
      await callback()
      setSelected(null)
    } finally {
      setBusyAction(null)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await onDelete(pendingDelete)
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_12px_40px_-24px_rgba(18,83,78,0.12)]">
      <div className="overflow-x-auto overscroll-contain">
        <table className="w-full select-none border-collapse text-right">
          <thead>
            <tr className="h-14 border-b border-border bg-secondary/50 text-base font-bold text-muted-foreground">
              <th className="px-6 py-3 font-extrabold text-foreground">#</th>
              <th className="px-6 py-3 font-extrabold text-foreground">المنتج</th>
              <th className="px-6 py-3 font-extrabold text-foreground">التصنيف</th>
              <th className="px-6 py-3 font-extrabold text-foreground">السعر</th>
              <th className="px-6 py-3 font-extrabold text-foreground">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-lg">
            {products.map((product, index) => {
              const image = productDisplayImage(product)
              return (
              <tr
                key={product.id}
                tabIndex={0}
                role="button"
                aria-label={`فتح تفاصيل المنتج ${product.name}`}
                onClick={() => setSelected(product)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelected(product)
                  }
                }}
                className="h-20 cursor-pointer transition-colors hover:bg-secondary/30 focus-visible:bg-secondary/30"
              >
                <td className="w-12 px-6 py-4 text-sm font-semibold text-muted-foreground">{startIndex + index + 1}</td>
                <td className="min-w-56 px-6 py-4 font-extrabold text-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/5 text-primary">
                      {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <Tag className="size-5" />}
                    </span>
                    <span className="line-clamp-1">{product.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-semibold text-muted-foreground">
                  <div className="flex items-center gap-2"><Folder className="size-4 shrink-0 text-primary/60" />{categoryMap.get(product.category_id) ?? 'غير مصنف'}</div>
                </td>
                <td className="min-w-32 px-6 py-4 font-extrabold text-primary">{formatLyd(product.price_lyd)}</td>
                <td className="px-6 py-4">
                  <Badge variant={product.is_active ? 'default' : 'destructive'} className="gap-1.5 px-3 py-1 text-sm">
                    <span className={`size-2 rounded-full ${product.is_active ? 'bg-emerald-300' : 'bg-red-300'}`} />
                    {product.is_active ? 'نشط' : 'معطّل'}
                  </Badge>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />

      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open && !isBusy) setSelected(null) }}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>تفاصيل المنتج</DialogTitle></DialogHeader>
          {selected ? (
            <div className="space-y-5 pt-2">
              <div className="flex items-center gap-4">
                <span className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-secondary text-primary">
                  {productDisplayImage(selected) ? <img src={productDisplayImage(selected)!} alt="" className="h-full w-full object-cover" /> : <Tag className="size-9" />}
                </span>
                <div className="min-w-0">
                  <h3 className="break-words text-xl font-extrabold">{selected.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{categoryName}</p>
                  <p className="mt-2 text-lg font-extrabold text-primary">{formatLyd(selected.price_lyd)}</p>
                </div>
              </div>

              <div className="grid gap-2 border-t border-border pt-4">
                <label className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-4 font-bold hover:bg-secondary ${isBusy ? 'pointer-events-none opacity-50' : ''}`}>
                  <ImagePlus className="size-5 text-primary" />
                  {busyAction === 'image' ? 'جاري حفظ الصورة...' : selected.image_url ? 'تغيير الصورة' : 'إضافة صورة'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={isBusy}
                    onChange={(event) => {
                      const image = event.target.files?.[0]
                      event.target.value = ''
                      if (image) void runAction('image', () => onImage(selected, image))
                    }}
                  />
                </label>
                {selected.image_url ? (
                  <Button variant="outline" disabled={isBusy} onClick={() => void runAction('remove-image', () => onRemoveImage(selected))}>
                    <ImageOff className="size-5" /> {busyAction === 'remove-image' ? 'جاري الإزالة...' : 'إزالة الصورة واستخدام الافتراضية'}
                  </Button>
                ) : null}
                <Button variant="outline" disabled={isBusy} onClick={() => void runAction('toggle', () => onToggle(selected))}>
                  {selected.is_active ? <ToggleRight className="size-5 text-emerald-600" /> : <ToggleLeft className="size-5" />}
                  {busyAction === 'toggle' ? 'جاري الحفظ...' : selected.is_active ? 'تعطيل المنتج' : 'تفعيل المنتج'}
                </Button>
                <Button
                  variant="destructive"
                  disabled={isBusy}
                  onClick={() => { setSelected(null); setPendingDelete(selected) }}
                >
                  <Trash2 className="size-5" /> حذف المنتج
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="حذف المنتج"
        description={pendingDelete ? `هل تريد حذف المنتج «${pendingDelete.name}»؟ لا يمكن التراجع عن هذا الإجراء.` : ''}
        confirmLabel="تأكيد الحذف"
        confirmVariant="destructive"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => setPendingDelete(null)}
      />
    </Card>
  )
}
