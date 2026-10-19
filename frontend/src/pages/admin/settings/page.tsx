import { Building2, ReceiptText, SlidersHorizontal } from 'lucide-react'

import { Card } from '../../../shared/ui/Card'
import { PageHeader } from '../../../shared/ui/PageHeader'

export function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="border-b border-border/40 pb-4">
        <PageHeader title="الإعدادات" description="مساحة لتخصيص بيانات المحل وتفضيلات النظام." />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Building2 className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-lg font-bold">بيانات المحل</h3>
            <p className="mt-1 text-sm text-muted-foreground">تخصيص اسم المحل ومعلوماته مستقبلاً</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
            <ReceiptText className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-lg font-bold">تفضيلات الفواتير</h3>
            <p className="mt-1 text-sm text-muted-foreground">ضبط خيارات عرض الفواتير مستقبلاً</p>
          </div>
        </Card>
      </div>

      <Card className="text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary">
          <SlidersHorizontal className="size-8" aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-xl font-bold">إعدادات النظام</h3>
        <p className="mx-auto mt-2 max-w-md text-base text-muted-foreground">
          هذه واجهة مبدئية لقسم الإعدادات. ستظهر خيارات التخصيص هنا عند إضافتها للنظام.
        </p>
      </Card>
    </div>
  )
}
