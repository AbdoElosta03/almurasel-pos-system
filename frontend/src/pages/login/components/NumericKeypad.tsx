import { Delete } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { PIN_MAX_LENGTH } from '../../../shared/lib/pinPolicy'

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

export function NumericKeypad({
  value,
  onChange,
  disabled = false,
  maxLength = PIN_MAX_LENGTH,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  maxLength?: number
}) {
  const append = (digit: string) => {
    if (disabled || value.length >= maxLength) return
    onChange(`${value}${digit}`)
  }

  const backspace = () => {
    if (disabled || value.length === 0) return
    onChange(value.slice(0, -1))
  }

  const clear = () => {
    if (disabled) return
    onChange('')
  }

  return (
    <div className="space-y-4">
      <div
        aria-label="كلمة المرور"
        className="flex h-16 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background px-4 text-2xl font-bold tracking-[0.35em] text-foreground shadow-sm"
      >
        {value.length > 0 ? '●'.repeat(value.length) : <span className="text-base font-semibold tracking-normal text-muted-foreground">أدخل كلمة المرور بالأرقام</span>}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {DIGITS.map((digit) => (
          <Button
            key={digit}
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => append(digit)}
            className="h-14 min-h-14 rounded-2xl border-border bg-background text-xl font-extrabold shadow-sm transition hover:border-primary/40 hover:bg-primary/5"
          >
            {digit}
          </Button>
        ))}
        <Button type="button" variant="secondary" disabled={disabled} onClick={clear} className="h-14 min-h-14 rounded-2xl text-sm font-bold">
          مسح
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => append('0')} className="h-14 min-h-14 rounded-2xl border-border bg-background text-xl font-extrabold shadow-sm transition hover:border-primary/40 hover:bg-primary/5">
          0
        </Button>
        <Button type="button" variant="secondary" disabled={disabled || value.length === 0} onClick={backspace} aria-label="حذف آخر رقم" className="h-14 min-h-14 rounded-2xl">
          <Delete className="size-5" />
        </Button>
      </div>
    </div>
  )
}
