import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Tag, Folder, CircleDollarSign, ImagePlus } from 'lucide-react'

import type { Category } from '../../../../types'
import { parseLydInput } from '../../../../utils/money'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { NativeSelect } from '../../../../components/ui/native-select'
import { Label } from '../../../../components/ui/label'

export function ProductCreateForm({
  categories,
  onCreate,
  onClose,
}: {
  categories: Category[]
  onCreate: (body: { category_id: number; name: string; price_lyd: number }, image: File | null) => Promise<void>
  onClose: () => void
}) {
  const [categoryId, setCategoryId] = useState(String(categories[0]?.id ?? ''))
  const [name, setName] = useState('')
  const [priceLyd, setPriceLyd] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !priceLyd.trim() || !categoryId) return
    setBusy(true)
    try {
       await onCreate({
         category_id: Number(categoryId),
         name,
         price_lyd: parseLydInput(priceLyd),
       }, image)
      setName('')
       setPriceLyd('')
       setImage(null)
      onClose()
    } catch {
      // Error is handled by parent or toast
    } finally {
      setBusy(false)
    }
  }

  const isFormValid = name.trim() && priceLyd.trim() && categoryId

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="product-name" className="text-base font-bold text-foreground">اسم المنتج</Label>
        <div className="relative">
          <Input
            id="product-name"
            placeholder="مثال: قهوة اسبريسو"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pr-10 h-14 rounded-2xl text-lg"
            disabled={busy}
          />
          <Tag className="absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="product-image" className="text-base font-bold text-foreground">صورة المنتج (اختيارية)</Label>
        <label htmlFor="product-image" className="flex h-14 cursor-pointer items-center gap-3 rounded-2xl border border-input bg-background px-4 text-base font-semibold hover:bg-secondary/50">
          <ImagePlus className="size-5 shrink-0 text-primary" />
          <span className="min-w-0 truncate">{image?.name ?? 'اختر صورة PNG أو JPEG أو WebP'}</span>
        </label>
        <Input
          id="product-image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={busy}
          onChange={(event) => setImage(event.target.files?.[0] ?? null)}
        />
        <p className="text-xs text-muted-foreground">الحد الأقصى 2 ميغابايت. ستظهر الصورة الافتراضية إذا لم تختر صورة.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="product-price" className="text-base font-bold text-foreground">السعر (د.ل)</Label>
        <div className="relative">
          <Input
            id="product-price"
            inputMode="decimal"
            placeholder="مثال: 3.500"
            value={priceLyd}
            onChange={(e) => setPriceLyd(e.target.value)}
            className="pr-10 h-14 rounded-2xl text-lg"
            disabled={busy}
          />
          <CircleDollarSign className="absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="product-category" className="text-base font-bold text-foreground">التصنيف</Label>
        <div className="relative">
          <NativeSelect
            id="product-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="pr-10 h-14 rounded-2xl text-lg"
            disabled={busy}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </NativeSelect>
          <Folder className="absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted-foreground z-10" />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-border/60">
        <Button
          type="submit"
          size="lg"
          loading={busy}
          disabled={!isFormValid || categories.length === 0}
          className="flex-1 h-14 rounded-2xl gap-2 font-bold text-lg"
        >
          <Plus className="size-5 shrink-0" />
          <span>إضافة المنتج</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onClose}
          disabled={busy}
          className="flex-1 h-14 rounded-2xl font-bold text-lg"
        >
          إلغاء
        </Button>
      </div>
    </form>
  )
}
