import { ClipboardList, PackagePlus, Truck } from 'lucide-react'

import { Card } from '../../../shared/ui/Card'
import { PageHeader } from '../../../shared/ui/PageHeader'

export function PurchasesPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="border-b border-border/40 pb-4">
        <PageHeader title="مشتريات" description="مساحة لمتابعة مشتريات المحل والموردين وفواتير التوريد." />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
            <PackagePlus className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-lg font-bold">فواتير المشتريات</h3>
            <p className="mt-1 text-sm text-muted-foreground">تسجيل ومراجعة فواتير التوريد مستقبلاً</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Truck className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-lg font-bold">الموردون</h3>
            <p className="mt-1 text-sm text-muted-foreground">تنظيم بيانات الموردين ومشترياتهم مستقبلاً</p>
          </div>
        </Card>
      </div>

      <Card className="text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary">
          <ClipboardList className="size-8" aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-xl font-bold">سجل المشتريات</h3>
        <p className="mx-auto mt-2 max-w-md text-base text-muted-foreground">
          هذه واجهة مبدئية لقسم المشتريات. ستظهر هنا الفواتير وعمليات التوريد عند إضافة وظيفة تسجيل المشتريات.
        </p>
      </Card>
    </div>
  )
}
