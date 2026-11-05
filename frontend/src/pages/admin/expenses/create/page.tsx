import { useNavigate } from 'react-router-dom'

import * as expensesApi from '../../../../api/expenses'
import type { ExpenseCreate } from '../../../../types'
import { Card } from '../../../../components/ui/card'
import { ExpenseCreateForm } from '../components/ExpenseCreateForm'

export function ExpenseCreatePage() {
  const navigate = useNavigate()

  const createExpense = async (body: ExpenseCreate) => {
    const expense = await expensesApi.createExpense(body)
    navigate('/admin/expenses', { state: { createdId: expense.id } })
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-3">
      <h1 className="text-xl font-extrabold sm:text-2xl">مصروف جديد</h1>
      <Card className="p-4 sm:p-5">
        <ExpenseCreateForm onCreate={createExpense} />
      </Card>
    </div>
  )
}
