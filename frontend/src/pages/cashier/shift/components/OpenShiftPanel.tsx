import { useState } from 'react'
import type { FormEvent } from 'react'

import { parseLydInput } from '../../../../utils/money'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'

export function OpenShiftPanel({ onOpen }: { onOpen: (openingCashLyd: number) => Promise<void> }) {
  const [openingCash, setOpeningCash] = useState('0')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      await onOpen(parseLydInput(openingCash))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="opening-cash">نقدية الفتح (د.ل)</Label>
        <Input
          id="opening-cash"
          inputMode="decimal"
          placeholder="0 أو 1.5"
          value={openingCash}
          onChange={(e) => setOpeningCash(e.target.value)}
        />
      </div>
      <Button type="submit" size="lg" disabled={busy} className="w-full">فتح الوردية</Button>
    </form>
  )
}
