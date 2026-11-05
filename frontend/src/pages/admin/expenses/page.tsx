import { useCallback, useEffect, useState } from 'react'
import { Plus, Wallet } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import * as expensesApi from '../../../api/expenses'
import { ApiError } from '../../../api/errors'
import type { ExpenseCategory, ExpenseList, ExpensePeriods, ExpenseSource } from '../../../types'
import { formatLyd } from '../../../utils/money'
import { EXPENSE_CATEGORY_LABEL, EXPENSE_SOURCE_LABEL, formatExpenseDate } from '../../../utils/expenseLabels'
import { Alert } from '../../../shared/ui/Alert'
import { DatePicker } from '../../../shared/ui/DatePicker'
import { LoadingBlock } from '../../../shared/ui/LoadingBlock'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { Pagination } from '../../../shared/ui/Pagination'
import { Select } from '../../../shared/ui/Select'
import { Toast, type ToastMessage } from '../../../shared/ui/Toast'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'

const PAGE_SIZE = 10

interface Filters {
  dateFrom: string
  dateTo: string
  category: '' | ExpenseCategory
  paidFrom: '' | ExpenseSource
  q: string
}

const emptyFilters = (): Filters => ({ dateFrom: '', dateTo: '', category: '', paidFrom: '', q: '' })

export function ExpensesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [draft, setDraft] = useState<Filters>(emptyFilters)
  const [applied, setApplied] = useState<Filters>(emptyFilters)
  const [report, setReport] = useState<ExpenseList | null>(null)
  const [periods, setPeriods] = useState<ExpensePeriods | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(() => {
    const state = location.state as { createdId?: number; deletedId?: number } | null
    if (state?.createdId) return { tone: 'success', text: `تم تسجيل المصروف #${state.createdId}` }
    if (state?.deletedId) return { tone: 'success', text: `تم حذف المصروف #${state.deletedId}` }
    return null
  })

  useEffect(() => {
    const state = location.state as { createdId?: number; deletedId?: number } | null
    if (state?.createdId || state?.deletedId) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  const load = useCallback(async (nextPage: number, filters: Filters) => {
    setLoading(true)
    setError(null)
    try {
      const [list, summary] = await Promise.all([
        expensesApi.listExpenses({
          page: nextPage,
          pageSize: PAGE_SIZE,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          category: filters.category,
          paidFrom: filters.paidFrom,
          q: filters.q.trim(),
        }),
        expensesApi.expenseSummary(),
      ])
      setReport(list)
      setPeriods(summary)
    } catch (err) {
      setReport(null)
      setError(err instanceof ApiError ? err.message : 'تعذر تحميل المصروفات')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(page, applied) }, [applied, load, page])

  const apply = () => {
    setPage(1)
    setApplied({ ...draft, q: draft.q.trim() })
  }

  const cards = periods
    ? [
        { label: 'اليوم', value: periods.day_lyd, count: periods.day_count },
        { label: 'هذا الأسبوع', value: periods.week_lyd, count: periods.week_count },
        { label: 'هذا الشهر', value: periods.month_lyd, count: periods.month_count },
      ]
    : []

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <PageHeader title="المصروفات" description="أجور ودفعات للموردين ومصروفات أخرى، من الدرج أو من خارجه." />
        <Button size="lg" asChild><Link to="/admin/expenses/new"><Plus className="size-5" /> مصروف جديد</Link></Button>
      </div>

      {cards.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.label} className="rounded-2xl border-primary/15">
              <CardContent className="flex flex-col justify-center px-4 py-4">
                <p className="text-sm font-bold text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-2xl font-extrabold text-primary">{formatLyd(card.value)}</p>
                <p className="text-xs text-muted-foreground">{card.count} مصروف</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
      <p className="text-sm text-muted-foreground">الأسبوع يبدأ السبت وينتهي الجمعة. هذه الإجماليات لكل المصروفات، والجدول أدناه يتبع التصفية.</p>

      <Card className="p-4">
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault()
            apply()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="expense-from">من تاريخ</Label>
            <DatePicker id="expense-from" value={draft.dateFrom} onChange={(value) => setDraft((current) => ({ ...current, dateFrom: value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-to">إلى تاريخ</Label>
            <DatePicker id="expense-to" value={draft.dateTo} onChange={(value) => setDraft((current) => ({ ...current, dateTo: value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-filter-category">النوع</Label>
            <Select id="expense-filter-category" value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as Filters['category'] }))}>
              <option value="">كل الأنواع</option>
              {(Object.keys(EXPENSE_CATEGORY_LABEL) as ExpenseCategory[]).map((key) => (
                <option key={key} value={key}>{EXPENSE_CATEGORY_LABEL[key]}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-filter-source">مصدر الدفع</Label>
            <Select id="expense-filter-source" value={draft.paidFrom} onChange={(event) => setDraft((current) => ({ ...current, paidFrom: event.target.value as Filters['paidFrom'] }))}>
              <option value="">كل المصادر</option>
              {(Object.keys(EXPENSE_SOURCE_LABEL) as ExpenseSource[]).map((key) => (
                <option key={key} value={key}>{EXPENSE_SOURCE_LABEL[key]}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="expense-search">بحث باسم المستفيد</Label>
            <Input id="expense-search" value={draft.q} maxLength={120} placeholder="اسم الباريستا أو المورد" onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))} />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" className="flex-1">تطبيق التصفية</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const cleared = emptyFilters()
                setDraft(cleared)
                setPage(1)
                setApplied(cleared)
              }}
            >
              مسح
            </Button>
          </div>
        </form>
      </Card>

      {error ? <Alert>{error}</Alert> : null}
      {loading ? <LoadingBlock /> : null}
      {!loading && !error && report?.items.length === 0 ? (
        <Card className="items-center gap-3 p-10 text-center">
          <Wallet className="size-12 text-primary" aria-hidden="true" />
          <h3 className="text-xl font-bold">لا توجد مصروفات مطابقة</h3>
          <p className="text-muted-foreground">غيّر التصفية أو اضغط «مصروف جديد» لتسجيل أول مصروف.</p>
        </Card>
      ) : null}
      {!loading && report && report.items.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3 text-sm font-bold">
            إجمالي النتائج: <span className="text-primary">{formatLyd(report.total_lyd)}</span>
          </div>
          <Table className="min-w-[760px]">
            <TableHeader className="bg-secondary/60">
              <TableRow className="hover:bg-secondary/60">
                <TableHead>التاريخ</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>المستفيد</TableHead>
                <TableHead>المصدر</TableHead>
                <TableHead>الوردية</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>سجّله</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.items.map((expense) => (
                <TableRow
                  key={expense.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`عرض تفاصيل المصروف رقم ${expense.id}`}
                  className="cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
                  onClick={() => navigate(`/admin/expenses/${expense.id}`)}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/admin/expenses/${expense.id}`) } }}
                >
                  <TableCell>{formatExpenseDate(expense.expense_date)}</TableCell>
                  <TableCell>{EXPENSE_CATEGORY_LABEL[expense.category]}</TableCell>
                  <TableCell className="max-w-56 truncate font-bold">{expense.payee_name}</TableCell>
                  <TableCell>{EXPENSE_SOURCE_LABEL[expense.paid_from]}</TableCell>
                  <TableCell>{expense.shift_id ? `#${expense.shift_id}` : '—'}</TableCell>
                  <TableCell className="font-extrabold text-primary">{formatLyd(expense.amount_lyd)}</TableCell>
                  <TableCell>{expense.created_by_username}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={report.page} pageSize={report.page_size} total={report.total} onPageChange={setPage} />
        </Card>
      ) : null}

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}
