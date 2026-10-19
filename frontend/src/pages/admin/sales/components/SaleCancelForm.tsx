import { useState } from 'react'
import type { FormEvent } from 'react'

import type { Sale } from '../../../../types'
import { formatLyd } from '../../../../utils/money'
import { Alert } from '../../../../shared/ui/Alert'
import { Button } from '../../../../shared/ui/Button'
import { Card } from '../../../../shared/ui/Card'
import { Input } from '../../../../shared/ui/Input'

export function SaleCancelForm({
  onCancel,
}: {
  onCancel: (saleId: number) => Promise<Sale>
}) {
  const [saleId, setSaleId] = useState('')
  const [result, setResult] = useState<Sale | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const sale = await onCancel(Number(saleId))
      setResult(sale)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر الإلغاء')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={onSubmit}>
        <Input
          type="number"
          min={1}
          placeholder="رقم الفاتورة"
          value={saleId}
          onChange={(e) => setSaleId(e.target.value)}
        />
        <Button type="submit" variant="danger" disabled={busy} className="sm:min-w-44">
          إلغاء الفاتورة
        </Button>
      </form>
      {error ? <Alert>{error}</Alert> : null}
      {result ? (
        <Card>
          <p className="text-lg font-semibold text-emerald-800">تم الإلغاء</p>
          <p className="text-base text-slate-600">
            فاتورة #{result.id} — {formatLyd(result.total_lyd)}
          </p>
        </Card>
      ) : null}
    </div>
  )
}
