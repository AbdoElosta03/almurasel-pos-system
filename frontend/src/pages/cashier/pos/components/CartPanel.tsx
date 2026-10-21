import type { PaymentMethod, Product } from '../../../../types'
import { formatLyd } from '../../../../utils/money'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Card } from '../../../../components/ui/card'
import { Separator } from '../../../../components/ui/separator'
import { Icon } from '../../../../shared/ui/Icon'
import { CheckoutBar } from './CheckoutBar'

export interface CartLine {
  product: Product
  qty: number
}

export function CartPanel({
  lines,
  totalLyd,
  onChangeQty,
  onClear,
  busy,
  onPay,
}: {
  lines: CartLine[]
  totalLyd: number
  onChangeQty: (productId: number, qty: number) => void
  onClear: () => void
  busy: boolean
  onPay: (method: PaymentMethod) => void
}) {
  const itemCount = lines.reduce((sum, line) => sum + line.qty, 0)

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-foreground sm:text-lg">
          <Icon name="bag" className="size-5 text-primary" /> الطلب الحالي
          <Badge variant="secondary">{itemCount}</Badge>
        </h3>
        <Button variant="ghost" size="icon" aria-label="مسح السلة" title="مسح السلة" onClick={onClear} disabled={lines.length === 0}>
          <Icon name="trash" className="size-5" />
        </Button>
      </div>
      {lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center text-muted-foreground">
          <span className="mb-4 flex size-20 items-center justify-center rounded-full bg-background text-foreground">
            <Icon name="bag" className="size-9" />
          </span>
          <p className="text-xl font-extrabold text-foreground">السلة فارغة</p>
          <p className="mt-2 text-sm">اضغط على أي منتج لإضافته إلى السلة.</p>
        </div>
      ) : null}
      {lines.length > 0 ? (
        <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain">
          {lines.map((line) => (
            <li key={line.product.id} className="rounded-xl border border-border bg-background p-3">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <p className="min-w-0 break-words text-base font-bold text-foreground">{line.product.name}</p>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="icon" variant="secondary" aria-label={`إنقاص ${line.product.name}`} onClick={() => onChangeQty(line.product.id, line.qty - 1)}>
                    −
                  </Button>
                  <span className="min-w-8 text-center text-lg font-bold">{line.qty}</span>
                  <Button size="icon" variant="secondary" aria-label={`زيادة ${line.product.name}`} onClick={() => onChangeQty(line.product.id, line.qty + 1)}>
                    +
                  </Button>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{formatLyd(line.product.price_lyd)}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <Separator className="my-2" />
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3 text-secondary-foreground">
          <span className="text-lg font-extrabold">الإجمالي</span>
          <strong className="text-xl font-extrabold sm:text-2xl">{formatLyd(totalLyd)}</strong>
        </div>
        <CheckoutBar disabled={lines.length === 0} busy={busy} onPay={onPay} />
      </div>
    </Card>
  )
}
