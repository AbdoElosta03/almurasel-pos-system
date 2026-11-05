import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import * as expensesApi from '../../../../api/expenses'
import { ApiError } from '../../../../api/errors'
import type { DrawerShiftOption, ExpenseCategory, ExpenseCreate, ExpenseSource } from '../../../../types'
import { parseLydInput } from '../../../../utils/money'
import { formatLibyaDateTime } from '../../../../utils/datetime'
import { EXPENSE_CATEGORY_LABEL, EXPENSE_SOURCE_LABEL } from '../../../../utils/expenseLabels'
import { Alert } from '../../../../shared/ui/Alert'
import { DatePicker } from '../../../../shared/ui/DatePicker'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import { Select } from '../../../../shared/ui/Select'

function today() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function ExpenseCreateForm({ onCreate }: { onCreate: (body: ExpenseCreate) => Promise<void> }) {
  const [expenseDate, setExpenseDate] = useState(today)
  const [category, setCategory] = useState<ExpenseCategory>('wage')
  const [payee, setPayee] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [paidFrom, setPaidFrom] = useState<ExpenseSource>('drawer')
  const [shiftId, setShiftId] = useState('')
  const [shifts, setShifts] = useState<DrawerShiftOption[]>([])
  const [shiftsError, setShiftsError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void expensesApi.drawerShifts()
      .then((rows) => { if (active) setShifts(rows) })
      .catch((err) => { if (active) setShiftsError(err instanceof ApiError ? err.message : 'تعذر تحميل الورديات') })
    return () => { active = false }
  }, [])

  const amountValue = (() => {
    try {
      return amount.trim() ? parseLydInput(amount) : 0
    } catch {
      return 0
    }
  })()
  const valid = Boolean(expenseDate) && payee.trim().length > 0 && amountValue > 0 && (paidFrom === 'external' || shiftId !== '')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    try {
      await onCreate({
        expense_date: expenseDate,
        category,
        payee_name: payee.trim(),
        note: note.trim() || null,
        amount_lyd: amountValue,
        paid_from: paidFrom,
        shift_id: paidFrom === 'drawer' ? Number(shiftId) : null,
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر حفظ المصروف')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="expense-date">التاريخ</Label>
          <DatePicker id="expense-date" value={expenseDate} onChange={setExpenseDate} disabled={busy} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expense-category">النوع</Label>
          <Select id="expense-category" value={category} disabled={busy} onChange={(event) => setCategory(event.target.value as ExpenseCategory)}>
            {(Object.keys(EXPENSE_CATEGORY_LABEL) as ExpenseCategory[]).map((key) => (
              <option key={key} value={key}>{EXPENSE_CATEGORY_LABEL[key]}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="expense-payee">اسم المستفيد</Label>
          <Input id="expense-payee" value={payee} maxLength={120} placeholder="اسم الباريستا أو المورد" disabled={busy} onChange={(event) => setPayee(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expense-amount">المبلغ (د.ل)</Label>
          <Input id="expense-amount" inputMode="decimal" value={amount} placeholder="مثال: 20" disabled={busy} onChange={(event) => setAmount(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expense-source">مصدر الدفع</Label>
          <Select
            id="expense-source"
            value={paidFrom}
            disabled={busy}
            onChange={(event) => {
              const next = event.target.value as ExpenseSource
              setPaidFrom(next)
              if (next === 'external') setShiftId('')
            }}
          >
            {(Object.keys(EXPENSE_SOURCE_LABEL) as ExpenseSource[]).map((key) => (
              <option key={key} value={key}>{EXPENSE_SOURCE_LABEL[key]}</option>
            ))}
          </Select>
        </div>
        {paidFrom === 'drawer' ? (
          <div className="space-y-2">
            <Label htmlFor="expense-shift">الوردية</Label>
            <Select id="expense-shift" value={shiftId} disabled={busy || shifts.length === 0} onChange={(event) => setShiftId(event.target.value)}>
              <option value="">اختر الوردية</option>
              {shifts.map((shift) => (
                <option key={shift.shift_id} value={shift.shift_id}>
                  #{shift.shift_id} · {shift.cashier_username} · {shift.status === 'open' ? 'مفتوحة' : 'مقفلة'} · {formatLibyaDateTime(shift.opened_at)}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="expense-note">ملاحظة (اختياري)</Label>
        <textarea
          id="expense-note"
          value={note}
          maxLength={240}
          disabled={busy}
          placeholder="تفاصيل قصيرة عن المصروف"
          onChange={(event) => setNote(event.target.value)}
          className="min-h-24 w-full rounded-xl border border-input bg-card px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      {paidFrom === 'drawer' && shifts.length === 0 && !shiftsError ? (
        <Alert>لا توجد وردية لم يُطابق حسابها. سجّل المصروف من خارج الدرج، أو انتظر وردية مفتوحة.</Alert>
      ) : null}
      {shiftsError ? <Alert>{shiftsError}</Alert> : null}
      {error ? <Alert>{error}</Alert> : null}
      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" size="lg" loading={busy} disabled={!valid}>حفظ المصروف</Button>
      </div>
    </form>
  )
}
