import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Folder } from 'lucide-react'

import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'

export function CategoryCreateForm({
  onCreate,
  onClose,
}: {
  onCreate: (name: string) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await onCreate(name.trim())
      setName('')
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="category-name" className="text-base font-bold text-foreground">اسم التصنيف</Label>
        <div className="relative">
          <Input
            id="category-name"
            placeholder="مثال: قهوة"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-14 rounded-2xl pr-10 text-lg"
            disabled={busy}
          />
          <Folder className="absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="flex gap-3 border-t border-border/60 pt-4">
        <Button
          type="submit"
          size="lg"
          loading={busy}
          disabled={!name.trim()}
          className="h-14 flex-1 rounded-2xl gap-2 text-lg font-bold"
        >
          <Plus className="size-5 shrink-0" />
          <span>إضافة التصنيف</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onClose}
          disabled={busy}
          className="h-14 flex-1 rounded-2xl text-lg font-bold"
        >
          إلغاء
        </Button>
      </div>
    </form>
  )
}
