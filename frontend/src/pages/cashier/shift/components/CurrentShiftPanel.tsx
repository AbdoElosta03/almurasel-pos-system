import type { Shift } from '../../../../types'
import { formatLyd } from '../../../../utils/money'
import { CardDescription, CardTitle } from '../../../../components/ui/card'

export function CurrentShiftPanel({ shift }: { shift: Shift }) {
  return (
    <div className="space-y-2">
      <CardTitle>وردية مفتوحة #{shift.id}</CardTitle>
      <CardDescription>نقدية الفتح: {formatLyd(shift.opening_cash_lyd)}</CardDescription>
      <p className="text-sm text-muted-foreground">منذ {new Date(shift.opened_at).toLocaleString('ar-LY')}</p>
    </div>
  )
}
