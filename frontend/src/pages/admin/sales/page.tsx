import * as salesApi from '../../../api/sales'
import { Card } from '../../../shared/ui/Card'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { SaleCancelForm } from './components/SaleCancelForm'

export function SalesCancelPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="إلغاء فاتورة" description="إلغاء فاتورة مكتملة بدون تعديل." />
      <Card>
        <SaleCancelForm onCancel={salesApi.cancelSale} />
      </Card>
    </div>
  )
}
