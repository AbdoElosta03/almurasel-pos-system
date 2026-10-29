import { useState } from 'react'
import type { FormEvent } from 'react'
import { Banknote, Play } from 'lucide-react'

import { parseLydInput } from '../../../../utils/money'
import { Alert } from '../../../../shared/ui/Alert'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'

export function OpenShiftPanel({ onOpen }: { onOpen: (openingCashLyd: number) => Promise<void> }) {
  const [openingCash, setOpeningCash] = useState('0')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onOpen(parseLydInput(openingCash))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر فتح الوردية')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="relative flex flex-col gap-5" onSubmit={onSubmit}>
      {busy ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-card/85">
          <span className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" aria-hidden="true" />
          <p className="text-sm font-bold">جاري فتح الوردية...</p>
        </div>
      ) : null}
      <div>
        <h3 className="text-xl font-extrabold">فتح وردية جديدة</h3>
        <p className="mt-1 text-sm text-muted-foreground">أدخل المبلغ الموجود في الصندوق قبل بدء البيع.</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="opening-cash" className="font-bold">المبلغ الموجود في الدرج قبل البيع (د.ل)</Label>
        <div className="relative">
          <Input
            id="opening-cash"
            inputMode="decimal"
            placeholder="0 أو 1.5"
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
            disabled={busy}
            className="h-14 rounded-2xl pr-11 text-lg"
          />
          <Banknote className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      <Button type="submit" size="lg" loading={busy} disabled={!openingCash.trim()} className="w-full rounded-2xl">
        <Play className="size-5" /> فتح الوردية
      </Button>
    </form>
  )
}
