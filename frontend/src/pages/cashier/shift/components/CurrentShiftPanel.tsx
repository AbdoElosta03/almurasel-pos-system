import type { Shift } from '../../../../types'
import { formatLyd } from '../../../../utils/money'
import { Banknote, CalendarClock, Clock3 } from 'lucide-react'
import { Card } from '../../../../components/ui/card'

export function CurrentShiftPanel({ shift }: { shift: Shift }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/50 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Clock3 className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">الوردية الحالية</p>
            <h3 className="text-xl font-extrabold">وردية #{shift.id}</h3>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">
          <span className="size-2 rounded-full bg-emerald-600" /> مفتوحة
        </span>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Banknote className="size-4" aria-hidden="true" /> نقدية الفتح</p>
          <p className="mt-2 text-xl font-extrabold text-primary">{formatLyd(shift.opening_cash_lyd)}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarClock className="size-4" aria-hidden="true" /> وقت الفتح</p>
          <p className="mt-2 text-base font-bold">{new Date(shift.opened_at).toLocaleString('ar-LY', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </div>
      </div>
    </Card>
  )
}
