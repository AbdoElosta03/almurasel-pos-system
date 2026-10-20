import { useNavigate } from 'react-router-dom'

import * as purchasesApi from '../../../../api/purchases'
import type { PurchaseCreate } from '../../../../types'
import { Card } from '../../../../components/ui/card'
import { PurchaseCreateForm } from '../components/PurchaseCreateForm'

export function PurchaseCreatePage() {
  const navigate = useNavigate()

  const createPurchase = async (body: PurchaseCreate) => {
    const purchase = await purchasesApi.createPurchase(body)
    navigate('/admin/purchases', { state: { createdId: purchase.id } })
  }

  return (
    <div className="mx-auto w-full space-y-3 px-5 sm:px-10 lg:px-16">
      <h1 className="text-xl font-extrabold sm:text-2xl">فاتورة مشتريات جديدة</h1>
      <Card className="p-4 sm:p-5">
        <PurchaseCreateForm onCreate={createPurchase} />
      </Card>
    </div>
  )
}
