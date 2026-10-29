import { useCallback, useEffect, useState } from 'react'
import { Scale } from 'lucide-react'

import * as dailyClosingsApi from '../../../api/dailyClosings'
import { ApiError } from '../../../api/errors'
import type { DailyClosing, DailyClosingResult } from '../../../types'
import { formatLibyaDateTime } from '../../../utils/datetime'
import { formatLyd, parseLydInput } from '../../../utils/money'
import { Alert } from '../../../shared/ui/Alert'
import { LoadingBlock } from '../../../shared/ui/LoadingBlock'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { DatePicker } from '../../../shared/ui/DatePicker'
import { Toast, type ToastMessage } from '../../../shared/ui/Toast'
import { tableHeadCellStickyClass, tableHeaderRowClass, tableScrollContainerClass } from '../../../shared/lib/tableScroll'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'

const RESULT_LABEL: Record<DailyClosingResult, string> = {
  open: 'لم تُغلق',
  pending: 'بانتظار العد',
  surplus: 'فائض',
  deficit: 'عجز',
  match: 'مطابق',
}

function todayValue() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function resultText(row: DailyClosing) {
  if (row.variance_lyd === null || row.result === 'open' || row.result === 'pending') {
    return RESULT_LABEL[row.result]
  }
  if (row.result === 'match') return RESULT_LABEL.match
  return `${RESULT_LABEL[row.result]} ${formatLyd(Math.abs(row.variance_lyd))}`
}

export function DailyClosingsPage() {
  const [date, setDate] = useState(todayValue)
  const [rows, setRows] = useState<DailyClosing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [selected, setSelected] = useState<DailyClosing | null>(null)
  const [counted, setCounted] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const load = useCallback(async (selectedDate: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await dailyClosingsApi.listDailyClosings(selectedDate)
      setRows(result.items)
    } catch (err) {
      setRows([])
      setError(err instanceof ApiError ? err.message : 'تعذر تحميل الورديات')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(date)
  }, [date, load])

  const openClose = (row: DailyClosing) => {
    setSelected(row)
    setCounted('')
    setFormError(null)
  }

  const save = async () => {
    if (!selected || saving) return
    setFormError(null)
    let amount: number
    try {
      amount = parseLydInput(counted)
    } catch {
      setFormError('أدخل المبلغ الذي وجدته في الدرج')
      return
    }
    setSaving(true)
    try {
      const saved = await dailyClosingsApi.closeDailyAccount(selected.shift_id, amount)
      setRows((current) => current.map((row) => (row.shift_id === saved.shift_id ? saved : row)))
      setSelected(null)
      setToast({ tone: 'success', text: `تم إغلاق الحساب: ${resultText(saved)}` })
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'تعذر إغلاق الحساب')
    } finally {
      setSaving(false)
    }
  }

  const sticky = tableHeadCellStickyClass(rows.length)
  const headers = [
    'رقم الوردية',
    'الكاشير',
    'وقت الفتح',
    'وقت الإغلاق',
    'في الدرج قبل البيع',
    'في الدرج عند الإغلاق',
    'إجمالي المبيعات',
    'ما عدّه المدير',
    'النتيجة',
    'إجراء',
  ]

  return (
    <div className="mx-auto w-full space-y-5 px-3 sm:px-5">
      <div className="border-b border-border/40 pb-4">
        <PageHeader
          title="إغلاق الحسابات اليومية"
          description="الورديات التي فُتحت في هذا التاريخ، مع مطابقة المبلغ الموجود في الدرج."
        />
      </div>

      <Card className="p-4">
        <div className="space-y-2">
          <Label htmlFor="closing-date">التاريخ</Label>
          <div className="w-full sm:w-72">
            <DatePicker id="closing-date" value={date} onChange={setDate} />
          </div>
        </div>
      </Card>

      {error ? <Alert>{error}</Alert> : null}
      {loading ? <LoadingBlock /> : null}
      {!loading && !error && rows.length === 0 ? (
        <Card className="items-center gap-3 p-10 text-center">
          <Scale className="size-12 text-primary" aria-hidden="true" />
          <h3 className="text-xl font-bold">لا توجد ورديات في هذا اليوم</h3>
          <p className="text-muted-foreground">اختر تاريخاً آخر لعرض الورديات التي فُتحت فيه.</p>
        </Card>
      ) : null}
      {!loading && rows.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <Table className="min-w-[960px] text-sm" containerClassName={tableScrollContainerClass(rows.length)}>
            <TableHeader className={tableHeaderRowClass(rows.length, true)}>
              <TableRow className="hover:bg-secondary/60">
                {headers.map((label) => (
                  <TableHead key={label} className={`${sticky} h-11 px-3 text-sm`}>{label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.shift_id}>
                  <TableCell className="px-3 py-3 font-extrabold">#{row.shift_id}</TableCell>
                  <TableCell className="px-3 py-3 font-extrabold">{row.cashier_username}</TableCell>
                  <TableCell className="px-3 py-3">{formatLibyaDateTime(row.opened_at)}</TableCell>
                  <TableCell className="px-3 py-3">{formatLibyaDateTime(row.closed_at)}</TableCell>
                  <TableCell className="px-3 py-3">{formatLyd(row.opening_cash_lyd)}</TableCell>
                  <TableCell className="px-3 py-3">{row.closing_cash_lyd === null ? '—' : formatLyd(row.closing_cash_lyd)}</TableCell>
                  <TableCell className="px-3 py-3">
                    <div className="font-extrabold">{formatLyd(row.sales_total_lyd)}</div>
                    <div className="text-[11px] text-muted-foreground">نقد {formatLyd(row.cash_sales_lyd)} · بطاقة {formatLyd(row.card_sales_lyd)}</div>
                  </TableCell>
                  <TableCell className="px-3 py-3">{row.counted_cash_lyd === null ? '—' : formatLyd(row.counted_cash_lyd)}</TableCell>
                  <TableCell className="px-3 py-3">
                    <Badge
                      variant={row.result === 'deficit' ? 'destructive' : row.result === 'surplus' || row.result === 'match' ? 'default' : 'outline'}
                      className={row.result === 'surplus' ? 'bg-emerald-700' : undefined}
                    >
                      {resultText(row)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    {row.result === 'pending' ? (
                      <Button type="button" size="sm" onClick={() => openClose(row)}>إغلاق الحساب</Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">{row.result === 'open' ? 'بانتظار الكاشير' : 'مغلق'}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}

      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open && !saving) setSelected(null) }}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>إغلاق حساب الوردية</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4 pt-2">
              <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm">
                <p>الوردية: <strong>#{selected.shift_id}</strong> — الكاشير: <strong>{selected.cashier_username}</strong></p>
                <p className="mt-2">المتوقع في الدرج: <strong className="text-primary">{formatLyd(selected.expected_drawer_lyd)}</strong></p>
                <p className="mt-1 text-muted-foreground">المبلغ قبل البيع + مبيعات النقد فقط.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="counted-cash">المبلغ الذي وجدته في الدرج (د.ل)</Label>
                <Input
                  id="counted-cash"
                  inputMode="decimal"
                  value={counted}
                  disabled={saving}
                  placeholder="مثال: 150"
                  onChange={(event) => {
                    setCounted(event.target.value)
                    setFormError(null)
                  }}
                />
              </div>
              {formError ? <Alert>{formError}</Alert> : null}
              <Button type="button" className="w-full" disabled={saving || !counted.trim()} onClick={() => void save()}>
                {saving ? 'جاري الحفظ...' : 'حفظ وإظهار النتيجة'}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}
