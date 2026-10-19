import { useState } from 'react'
import type { FormEvent } from 'react'

import type { Shift } from '../../../../types'
import { parseLydInput } from '../../../../utils/money'
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

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      await onClose(parseLydInput(closingCash))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="mt-4 flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="closing-cash">نقدية الإقفال (د.ل)</Label>
        <Input
          id="closing-cash"
          inputMode="decimal"
          placeholder="0 أو 1.5"
          value={closingCash}
          onChange={(e) => setClosingCash(e.target.value)}
        />
      </div>
      <Button type="submit" variant="destructive" size="lg" disabled={busy} className="w-full">إقفال الوردية</Button>
    </form>
  )
}
