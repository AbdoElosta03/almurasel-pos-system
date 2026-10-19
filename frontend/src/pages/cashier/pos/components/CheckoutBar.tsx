import type { PaymentMethod } from '../../../../types'
import { Button } from '../../../../components/ui/button'
import { Icon } from '../../../../shared/ui/Icon'

export function CheckoutBar({
  disabled,
  busy,
  onPay,
}: {
  disabled: boolean
  busy: boolean
  onPay: (method: PaymentMethod) => void
}) {
  return (
    <div className="grid shrink-0 grid-cols-2 gap-2 sm:gap-3">
      <Button size="xl" disabled={disabled || busy} className="w-full gap-2 px-2 text-base sm:text-lg" onClick={() => onPay('cash')}>
        <Icon name="cash" className="size-6" />
        {busy ? 'جاري الدفع...' : 'دفع نقدي'}
      </Button>
      <Button size="xl" variant="secondary" disabled={disabled || busy} className="w-full gap-2 px-2 text-base sm:text-lg" onClick={() => onPay('card')}>
        <Icon name="card" className="size-6" />
        {busy ? 'جاري الدفع...' : 'دفع بطاقة'}
      </Button>
    </div>
  )
}
