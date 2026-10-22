import { useState } from 'react'
import { KeyRound, Printer } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../shared/ui/Card'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { isReceiptPrintingEnabled, setReceiptPrintingEnabled } from '../../../utils/receiptSettings'
import { ChangePasswordDialog } from '../../admin/settings/components/ChangePasswordCard'

export function CashierSettingsPage() {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [printEnabled, setPrintEnabled] = useState(() => isReceiptPrintingEnabled())

  const togglePrinting = () => {
    const next = !printEnabled
    setReceiptPrintingEnabled(next)
    setPrintEnabled(next)
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="border-b border-border/40 pb-4">
        <PageHeader title="الإعدادات" description="إدارة إعدادات حسابك والطباعة." />
      </div>
      <Card className="flex items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Printer className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold">طباعة الفاتورة</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            طباعة فاتورة على طابعة XPRINTER بعد الدفع. أوقفها إذا نفد ورق الطابعة.
          </p>
        </div>
        <Button
          type="button"
          variant={printEnabled ? 'default' : 'outline'}
          aria-pressed={printEnabled}
          onClick={togglePrinting}
          className="shrink-0"
        >
          {printEnabled ? 'مفعّلة' : 'متوقفة'}
        </Button>
      </Card>
      <Card className="flex items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
          <KeyRound className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold">كلمة المرور</h3>
          <p className="mt-1 text-sm text-muted-foreground">تغيير كلمة مرور حسابك الحالي.</p>
        </div>
        <Button onClick={() => setPasswordDialogOpen(true)} className="shrink-0">تغيير كلمة المرور</Button>
      </Card>
      <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
    </div>
  )
}
