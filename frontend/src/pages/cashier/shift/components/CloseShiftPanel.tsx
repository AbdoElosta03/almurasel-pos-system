import { useState } from 'react'
import type { FormEvent } from 'react'
import { Banknote, LockKeyhole } from 'lucide-react'

import type { Shift } from '../../../../types'
import { parseLydInput } from '../../../../utils/money'
import { Alert } from '../../../../shared/ui/Alert'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'

export function CloseShiftPanel({
  shift,
  onClose,
}: {
  shift: Shift
  onClose: (closingCashLyd: number) => Promise<void>
}) {
  const [closingCash, setClosingCash] = useState(String(shift.opening_cash_lyd))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onClose(parseLydInput(closingCash))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إقفال الوردية')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <div>
        <div className="flex items-center gap-2 text-primary">
          <LockKeyhole className="size-5" aria-hidden="true" />
          <h3 className="text-xl font-extrabold text-foreground">إقفال الوردية</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">عدّ النقدية الموجودة في الصندوق وأدخل المبلغ النهائي.</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="closing-cash" className="font-bold">المبلغ الموجود في الدرج عند الإغلاق (د.ل)</Label>
        <div className="relative">
          <Input
            id="closing-cash"
            inputMode="decimal"
            placeholder="0 أو 1.5"
            value={closingCash}
            onChange={(e) => setClosingCash(e.target.value)}
            disabled={busy}
            className="h-14 rounded-2xl pr-11 text-lg"
          />
          <Banknote className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      <Button type="submit" variant="destructive" size="lg" loading={busy} disabled={!closingCash.trim()} className="w-full rounded-2xl">
        <LockKeyhole className="size-5" /> إقفال الوردية
      </Button>
    </form>
  )
}
