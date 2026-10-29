import { useState } from 'react'
import { KeyRound, Printer } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../shared/ui/Card'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { isReceiptPrintingEnabled, setReceiptPrintingEnabled } from '../../../utils/receiptSettings'
import { ChangePasswordDialog } from '../../admin/settings/components/ChangePasswordCard'
import { printerStatus } from '../../../api/printer'
import { translateError } from '../../../api/errorMessages'

export function CashierSettingsPage() {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [printEnabled, setPrintEnabled] = useState(() => isReceiptPrintingEnabled())
  const [printerMessage, setPrinterMessage] = useState<string | null>(null)
  const [checkingPrinter, setCheckingPrinter] = useState(false)

  const checkPrinter = async () => {
    setCheckingPrinter(true)
    try {
      const status = await printerStatus()
      setPrinterMessage(`${status.name}: ${translateError(status.code)}`)
    } catch {
      setPrinterMessage('تعذر فحص الطابعة؛ تحقق من اتصال الخادم.')
    } finally {
      setCheckingPrinter(false)
    }
  }

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
      <Card className="flex flex-wrap items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Printer className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold">طباعة الفاتورة</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            طباعة مباشرة عبر ويندوز بدون إعادة محاولة تلقائية. تتوقف الطباعة تلقائيًا عند الفشل ويبقى البيع محفوظًا؛ أعد تفعيلها بعد معالجة المشكلة. أوقفها عند نفاد الورق.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">فحص الجاهزية يعتمد على تعريف الطابعة، ولا يضمن اكتشاف نفاد الورق. ألغِ الفواتير القديمة من طابور ويندوز قبل التجربة.</p>
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
        <Button variant="outline" onClick={() => void checkPrinter()} loading={checkingPrinter}>فحص الطابعة</Button>
        {printerMessage ? <p className="w-full text-sm" role="status">{printerMessage}</p> : null}
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
