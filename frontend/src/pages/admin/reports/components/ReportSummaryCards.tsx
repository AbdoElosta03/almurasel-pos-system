import { Banknote, Ban, CreditCard, ReceiptText, RotateCcw, WalletCards } from 'lucide-react'

import type { SalesReportSummary } from '../../../../types'
import { formatLyd } from '../../../../utils/money'
import { Card, CardContent } from '../../../../components/ui/card'

export function ReportSummaryCards({ summary }: { summary: SalesReportSummary }) {
  const items = [
    { label: 'الفواتير', value: String(summary.count), icon: ReceiptText },
    { label: 'الإجمالي', value: formatLyd(summary.total_lyd), icon: WalletCards },
    { label: 'نقدي', value: formatLyd(summary.cash_lyd), icon: Banknote },
    { label: 'بطاقة', value: formatLyd(summary.card_lyd), icon: CreditCard },
    { label: 'الملغاة', value: String(summary.cancelled_count), icon: Ban },
    { label: 'مبلغ الملغاة', value: formatLyd(summary.cancelled_lyd), icon: RotateCcw },
  ]

  return (
    <div className="grid grid-cols-[repeat(6,minmax(0,1fr))] gap-2">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Card key={item.label} className="h-24 overflow-hidden rounded-2xl border-primary/15">
            <CardContent className="flex h-full flex-col justify-center !px-3 !py-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Icon className="size-4" />
                </span>
                <p className="text-[11px] font-bold leading-tight text-muted-foreground">{item.label}</p>
              </div>
              <p className="mt-1.5 whitespace-nowrap text-lg font-extrabold text-primary">{item.value}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
