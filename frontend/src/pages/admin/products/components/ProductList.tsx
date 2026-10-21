import { useState } from 'react'
import { Trash2, ToggleLeft, ToggleRight, Folder, Tag, Layers3, ImagePlus, ImageOff } from 'lucide-react'

import type { Category, Product } from '../../../../types'
import { formatLyd } from '../../../../utils/money'
import { Button } from '../../../../components/ui/button'
import { Card } from '../../../../components/ui/card'
import { Badge } from '../../../../components/ui/badge'
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
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [uploadingId, setUploadingId] = useState<number | null>(null)

  if (products.length === 0) {
    return (
      <Card className="rounded-[2rem] border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
        <div className="flex flex-col items-center justify-center space-y-4">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Layers3 className="size-8" />
          </span>
          <div>
            <p className="text-xl font-extrabold text-foreground">لا توجد منتجات مسجلة</p>
            <p className="text-sm mt-1">اضغط على زر إضافة منتج جديد بالأعلى لبدء القائمة.</p>
          </div>
        </div>
      </Card>
    )
  }

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

  const handleToggle = async (product: Product) => {
    setTogglingId(product.id)
    try {
      await onToggle(product)
    } finally {
      setTogglingId(null)
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

  const uploadImage = async (product: Product, image: File) => {
    setUploadingId(product.id)
    try {
      await onImage(product, image)
    } finally {
      setUploadingId(null)
    }
  }

  const removeImage = async (product: Product) => {
    setUploadingId(product.id)
    try {
      await onRemoveImage(product)
    } finally {
      setUploadingId(null)
    }
  }

  const isActionBusy = togglingId !== null || deleting || uploadingId !== null

  return (
    <Card className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_12px_40px_-24px_rgba(18,83,78,0.12)]">
      <div className="overflow-x-auto overscroll-contain">
        <table className="w-full text-right border-collapse select-none">
          <thead>
            <tr className="border-b border-border bg-secondary/50 text-base font-bold text-muted-foreground h-14">
              <th className="px-6 py-3 font-extrabold text-foreground">#</th>
              <th className="px-6 py-3 font-extrabold text-foreground">المنتج</th>
              <th className="px-6 py-3 font-extrabold text-foreground">التصنيف</th>
              <th className="px-6 py-3 font-extrabold text-foreground">السعر</th>
              <th className="px-6 py-3 font-extrabold text-foreground">الحالة</th>
              <th className="px-6 py-3 text-center font-extrabold text-foreground">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-lg">
            {products.map((product, index) => {
              const categoryName = categoryMap.get(product.category_id) ?? 'غير مصنف'
              const isToggling = togglingId === product.id

              return (
                <tr key={product.id} className="hover:bg-secondary/10 transition-colors h-20">
                  {/* Row index */}
                  <td className="px-6 py-4 text-sm font-semibold text-muted-foreground w-12">
                     {startIndex + index + 1}
                  </td>

                  {/* Product Name */}
                  <td className="px-6 py-4 font-extrabold text-foreground min-w-56">
                    <div className="flex items-center gap-3">
                      <span className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-primary/5 text-primary shrink-0">
                        {product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <Tag className="size-5" />}
                      </span>
                      <span className="line-clamp-1">{product.name}</span>
                    </div>
                  </td>

                  {/* Category Name */}
                  <td className="px-6 py-4 font-semibold text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Folder className="size-4 text-primary/60 shrink-0" />
                      <span>{categoryName}</span>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="px-6 py-4 font-extrabold text-primary min-w-32">
                    {formatLyd(product.price_lyd)}
                  </td>

                  {/* Active Status Badge */}
                  <td className="px-6 py-4">
                    <Badge variant={product.is_active ? 'default' : 'destructive'} className="gap-1.5 px-3 py-1 text-sm">
                      <span className={`size-2 rounded-full ${product.is_active ? 'bg-emerald-300' : 'bg-red-300'}`} />
                      {product.is_active ? 'نشط' : 'معطّل'}
                    </Badge>
                  </td>

                  {/* Actions (Touch buttons with loading indicators) */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                      <label className={`inline-flex h-11 min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-border/80 px-4 text-base font-bold text-foreground hover:bg-secondary ${isActionBusy ? 'pointer-events-none opacity-50' : ''}`}>
                        <ImagePlus className="size-5 text-primary" />
                        <span>{uploadingId === product.id ? 'جاري الرفع...' : product.image_url ? 'تغيير الصورة' : 'إضافة صورة'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="sr-only"
                          disabled={isActionBusy}
                          onChange={(event) => {
                            const image = event.target.files?.[0]
                            event.target.value = ''
                            if (image) void uploadImage(product, image)
                          }}
                        />
                      </label>
                      {product.image_url ? (
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={isActionBusy}
                          onClick={() => void removeImage(product)}
                          className="size-11 min-h-11 rounded-xl"
                          title="إزالة الصورة واستخدام الافتراضية"
                          aria-label={`إزالة صورة المنتج ${product.name}`}
                        >
                          <ImageOff className="size-5" />
                        </Button>
                      ) : null}
                      <Button
                        variant={product.is_active ? 'outline' : 'secondary'}
                        size="sm"
                        onClick={() => handleToggle(product)}
                        disabled={isActionBusy}
                        loading={isToggling}
                        className="h-11 min-h-11 px-4 rounded-xl gap-1.5 font-bold text-base border-border/80 text-foreground"
                      >
                        {!isToggling && (
                          product.is_active ? (
                            <>
                              <ToggleRight className="size-5 text-emerald-600 shrink-0" />
                              <span>تعطيل</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="size-5 text-muted-foreground shrink-0" />
                              <span>تفعيل</span>
                            </>
                          )
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setPendingDelete(product)}
                        disabled={isActionBusy}
                        className="size-11 min-h-11 rounded-xl bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white shrink-0 p-0"
                        title="حذف المنتج"
                        aria-label={`حذف المنتج ${product.name}`}
                      >
                        <Trash2 className="size-5 shrink-0" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />
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
