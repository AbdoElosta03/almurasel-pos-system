import { useState } from 'react'
import type { FormEvent } from 'react'
import { Trash2, Wallet } from 'lucide-react'

import * as expensesApi from '../../../../api/expenses'
import { ApiError } from '../../../../api/errors'
import type { Expense, ExpenseCategory } from '../../../../types'
import { formatLyd, parseLydInput } from '../../../../utils/money'
import { EXPENSE_CATEGORY_LABEL } from '../../../../utils/expenseLabels'
import { Alert } from '../../../../shared/ui/Alert'
import { ConfirmDialog } from '../../../../shared/ui/ConfirmDialog'
import { Button } from '../../../../components/ui/button'
import { Card } from '../../../../components/ui/card'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import { Select } from '../../../../shared/ui/Select'

function today() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function DrawerExpensesPanel({
  items,
  totalLyd,
  onChanged,
}: {
  items: Expense[]
  totalLyd: number
  onChanged: () => Promise<void>
}) {
  const [category, setCategory] = useState<ExpenseCategory>('wage')
  const [payee, setPayee] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null)

  const amountValue = (() => {
    try {
      return amount.trim() ? parseLydInput(amount) : 0
    } catch {
      return 0
    }
  })()
  const valid = payee.trim().length > 0 && amountValue > 0

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    try {
      await expensesApi.createExpense({
        expense_date: today(),
        category,
        payee_name: payee.trim(),
        note: note.trim() || null,
        amount_lyd: amountValue,
        paid_from: 'drawer',
      })
      setPayee('')
      setAmount('')
      setNote('')
      setCategory('wage')
      await onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر تسجيل المصروف')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!pendingDelete || busy) return
    setBusy(true)
    setError(null)
    try {
      await expensesApi.deleteExpense(pendingDelete.id)
      setPendingDelete(null)
      await onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر حذف المصروف')
      setPendingDelete(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-primary">
          <Wallet className="size-5" aria-hidden="true" />
          <h3 className="text-xl font-extrabold text-foreground">مصروف من الدرج</h3>
        </div>
        <p className="text-sm font-extrabold text-primary">{formatLyd(totalLyd)}</p>
      </div>
      <p className="text-sm text-muted-foreground">يُخصم هذا المبلغ من النقد المتوقع عند إغلاق الوردية. الدفع من خارج الدرج يسجّله المدير.</p>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
        <div className="space-y-2">
          <Label htmlFor="drawer-category">النوع</Label>
          <Select id="drawer-category" value={category} disabled={busy} onChange={(event) => setCategory(event.target.value as ExpenseCategory)}>
            {(Object.keys(EXPENSE_CATEGORY_LABEL) as ExpenseCategory[]).map((key) => (
              <option key={key} value={key}>{EXPENSE_CATEGORY_LABEL[key]}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="drawer-payee">اسم المستفيد</Label>
          <Input id="drawer-payee" value={payee} maxLength={120} disabled={busy} placeholder="اسم الباريستا أو المورد" onChange={(event) => setPayee(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="drawer-amount">المبلغ (د.ل)</Label>
          <Input id="drawer-amount" inputMode="decimal" value={amount} disabled={busy} placeholder="مثال: 15" onChange={(event) => setAmount(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="drawer-note">ملاحظة</Label>
          <Input id="drawer-note" value={note} maxLength={240} disabled={busy} placeholder="اختياري" onChange={(event) => setNote(event.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={!valid} loading={busy}>تسجيل المصروف</Button>
        </div>
      </form>
      {error ? <Alert>{error}</Alert> : null}
      {items.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد مصروفات من درج هذه الوردية.</p> : (
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {items.map((expense) => (
            <li key={expense.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
              <div className="min-w-0">
                <p className="truncate font-bold">{expense.payee_name}</p>
                <p className="text-xs text-muted-foreground">{EXPENSE_CATEGORY_LABEL[expense.category]} · {expense.created_by_username}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-extrabold text-primary">{formatLyd(expense.amount_lyd)}</span>
                <Button type="button" variant="ghost" size="sm" aria-label={`حذف مصروف ${expense.payee_name}`} disabled={busy} onClick={() => setPendingDelete(expense)}>
                  <Trash2 className="size-4 text-red-700" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="حذف مصروف الدرج"
        description={pendingDelete ? `حذف مصروف ${pendingDelete.payee_name} بمبلغ ${formatLyd(pendingDelete.amount_lyd)}؟` : ''}
        confirmLabel="تأكيد الحذف"
        confirmVariant="destructive"
        busy={busy}
        onConfirm={() => void remove()}
        onClose={() => { if (!busy) setPendingDelete(null) }}
      />
    </Card>
  )
}
