import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'

import * as expensesApi from '../../../../api/expenses'
import { ApiError } from '../../../../api/errors'
import type { Expense } from '../../../../types'
import { formatLyd } from '../../../../utils/money'
import { formatLibyaDateTime } from '../../../../utils/datetime'
import { EXPENSE_CATEGORY_LABEL, EXPENSE_SOURCE_LABEL, formatExpenseDate } from '../../../../utils/expenseLabels'
import { Alert } from '../../../../shared/ui/Alert'
import { ConfirmDialog } from '../../../../shared/ui/ConfirmDialog'
import { LoadingBlock } from '../../../../shared/ui/LoadingBlock'
import { Button } from '../../../../components/ui/button'
import { Card } from '../../../../components/ui/card'

export function ExpenseDetailsPage() {
  const { expenseId } = useParams()
  const navigate = useNavigate()
  const [expense, setExpense] = useState<Expense | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const id = Number(expenseId)
    setExpense(null)
    setError(null)
    if (!expenseId || !/^\d+$/.test(expenseId) || !Number.isSafeInteger(id) || id < 1) {
      setError('المصروف غير موجود')
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    void expensesApi.getExpense(id)
      .then((result) => { if (active) setExpense(result) })
      .catch((err) => { if (active) setError(err instanceof ApiError ? err.message : 'تعذر تحميل تفاصيل المصروف') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [expenseId])

  const remove = async () => {
    if (!expense || deleting) return
    setDeleting(true)
    setError(null)
    try {
      await expensesApi.deleteExpense(expense.id)
      navigate('/admin/expenses', { replace: true, state: { deletedId: expense.id } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر حذف المصروف')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold sm:text-2xl">تفاصيل المصروف #{expenseId}</h1>
        {expense?.deletable ? (
          <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" /> حذف المصروف
          </Button>
        ) : null}
      </div>
      {loading ? <LoadingBlock /> : null}
      {error ? <Alert>{error}</Alert> : null}
      {!loading && expense ? (
        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <p>التاريخ: <strong>{formatExpenseDate(expense.expense_date)}</strong></p>
          <p>النوع: <strong>{EXPENSE_CATEGORY_LABEL[expense.category]}</strong></p>
          <p>المستفيد: <strong>{expense.payee_name}</strong></p>
          <p>المبلغ: <strong className="text-primary">{formatLyd(expense.amount_lyd)}</strong></p>
          <p>مصدر الدفع: <strong>{EXPENSE_SOURCE_LABEL[expense.paid_from]}</strong></p>
          <p>الوردية: <strong>{expense.shift_id ? `#${expense.shift_id}${expense.shift_cashier_username ? ` — ${expense.shift_cashier_username}` : ''}` : '—'}</strong></p>
          <p>سجّله: <strong>{expense.created_by_username}</strong></p>
          <p>وقت التسجيل: <strong>{formatLibyaDateTime(expense.created_at)}</strong></p>
          <p className="sm:col-span-2">الملاحظة: <strong>{expense.note || 'لا توجد ملاحظة'}</strong></p>
          {expense.deletable ? null : (
            <p className="text-sm text-muted-foreground sm:col-span-2">لا يمكن حذف هذا المصروف لأن حساب الوردية طُوبق. التصحيح قبل المطابقة يكون بالحذف ثم التسجيل من جديد.</p>
          )}
        </Card>
      ) : null}
      <ConfirmDialog
        open={confirmDelete}
        title="حذف المصروف"
        description={expense ? `هل تريد حذف المصروف #${expense.id} نهائيًا؟ لا يمكن تعديل المصروف، والتصحيح قبل مطابقة الوردية يكون بإعادة تسجيله.` : ''}
        confirmLabel="تأكيد الحذف"
        confirmVariant="destructive"
        busy={deleting}
        onConfirm={() => void remove()}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}
