import { CalendarDays, ChevronLeft, ChevronRight, Package, Search, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ApiError } from '../../../../api/errors'
import * as reportsApi from '../../../../api/reports'
import type { DailyProductSales } from '../../../../types'
import { Alert } from '../../../../shared/ui/Alert'
import { PageHeader } from '../../../../shared/ui/PageHeader'
import { Select } from '../../../../shared/ui/Select'
import { Button } from '../../../../components/ui/button'
import { Card, CardContent } from '../../../../components/ui/card'
import { Input } from '../../../../components/ui/input'
import { formatLyd, toLydNumber } from '../../../../utils/money'
import { dailySalesInsights } from '../../../../utils/dailySalesInsights'

function parseIsoDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function shiftDate(iso: string, days: number) {
  const date = parseIsoDate(iso)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDay(iso: string) {
  return new Intl.DateTimeFormat('ar-LY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(parseIsoDate(iso))
}

export function DailyProductSalesPage() {
  // The initial response supplies today's date in the server's configured timezone.
  const [selectedDate, setSelectedDate] = useState('')
  const [today, setToday] = useState('')
  const [report, setReport] = useState<DailyProductSales | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('qty')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setReport(null)
    void reportsApi.dailyProductSales(selectedDate || 0)
      .then((data) => {
        if (cancelled) return
        setReport(data)
        if (!selectedDate) setToday(data.date)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'تعذر تحميل الإحصائية')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [selectedDate, retry])

  const activeDate = selectedDate || today
  const items = [...(report?.items ?? [])]
    .filter((item) => item.product_name.toLocaleLowerCase('ar').includes(search.trim().toLocaleLowerCase('ar')))
    .sort((a, b) => {
      if (sort === 'name') return a.product_name.localeCompare(b.product_name, 'ar')
      if (sort === 'total') return toLydNumber(b.total_lyd) - toLydNumber(a.total_lyd)
      return b.qty - a.qty || a.product_name.localeCompare(b.product_name, 'ar')
    })
  const total = report?.items.reduce((sum, item) => sum + toLydNumber(item.total_lyd), 0) ?? 0
  const topQty = Math.max(...(report?.items.map((item) => item.qty) ?? []), 1)
  const insights = dailySalesInsights(report?.items ?? [])
  const formatQuantity = (value: number) => Math.round(value).toLocaleString('ar-LY')

  return (
    <div className="mx-auto w-[calc(100%-1rem)] max-w-[1280px] space-y-4 sm:w-[calc(100%-3rem)] lg:w-[calc(100%-5rem)]">
      <div className="flex flex-wrap items-start justify-between gap-3" dir="rtl">
        <div className="min-w-0 flex-1 basis-72 [&>header]:mb-0">
          <PageHeader title="إحصائيات مبيعات الأصناف اليومية" description="اختر يومًا لاستعراض الكميات وقيمة مبيعات الأصناف من الفواتير المكتملة فقط." />
        </div>
      <nav aria-label="التنقل بين أيام المبيعات" className="ms-auto flex shrink-0 flex-wrap justify-end gap-1" dir="rtl">
        <Button size="sm" variant="secondary" className="rounded-full border border-primary/20 px-4 text-primary shadow-sm" disabled={!activeDate || activeDate <= '0001-01-01'} onClick={() => setSelectedDate(shiftDate(activeDate, -1))}>
          <ChevronRight className="size-4" aria-hidden="true" /> اليوم السابق
        </Button>
        <Button size="sm" variant="secondary" className="rounded-full border border-primary/20 px-4 text-primary shadow-sm" disabled={!activeDate || activeDate >= today} onClick={() => setSelectedDate(shiftDate(activeDate, 1))}>
          اليوم التالي <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
      </nav>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="grid gap-3 !p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-4 sm:!p-4">
          <div className="space-y-2">
            <div className="space-y-1">
              <label htmlFor="sales-date" className="flex items-center gap-2 text-sm font-bold">
                <CalendarDays className="size-4 text-primary" aria-hidden="true" /> تاريخ المبيعات
              </label>
              <Input id="sales-date" type="date" dir="ltr" className="h-11 min-h-11" value={activeDate} max={today || undefined} disabled={!today}
                onChange={(event) => {
                  const value = event.target.value
                  if (value && value <= today && event.target.validity.valid) setSelectedDate(value)
                }} />
            </div>
            <p className="text-xs font-bold text-primary">{activeDate ? formatDay(activeDate) : 'تحديد تاريخ اليوم…'}</p>
          </div>
          <div aria-label="قيمة مبيعات اليوم" aria-busy={loading} className="flex min-w-0 flex-col justify-center rounded-xl bg-secondary/50 px-3 py-3">
                <p className="text-xs text-muted-foreground">قيمة المبيعات</p>
                {loading ? <div aria-hidden="true" className="mt-2 h-7 w-16 max-w-full animate-pulse rounded bg-muted motion-reduce:animate-none" /> :
                  <p className="mt-1 break-words text-lg font-extrabold tabular-nums text-primary sm:text-2xl">{report ? formatLyd(total) : '—'}</p>}
          </div>
        </CardContent>
      </Card>

      <section aria-label="نتائج مبيعات الأصناف" aria-busy={loading} className="space-y-3">
        {error ? <div className="space-y-3"><Alert>{error}</Alert><Button variant="outline" onClick={() => setRetry((value) => value + 1)}>إعادة المحاولة</Button></div> : null}
        {loading ? (
          <div role="status">
            <p className="text-sm text-muted-foreground">جاري تحميل مبيعات اليوم المحدد…</p>
          </div>
        ) : report ? (
          <>
            <Card className="rounded-2xl">
              <CardContent className="space-y-3 !p-3 sm:!p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-extrabold">استنتاجات</h2>
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">حسبة تقديرية وليست دقيقة بالكامل</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { label: 'البن المستخدم', value: insights.coffeeKg, unit: 'كيلو بن', detail: `${formatQuantity(insights.regularCoffee)} عادية + ${formatQuantity(insights.doubleCoffee)} دبل × 2 = ${formatQuantity(insights.coffeeEquivalent)} قهوة عادية، ÷ 75` },
                    { label: 'الحليب المستهلك', value: insights.milkCans, unit: 'علبة حليب', detail: 'كمية البن بالكيلو × 3 علب حليب' },
                    { label: 'الماء المباع', value: insights.waterCases, unit: 'صندوق ماء', detail: `${formatQuantity(insights.waterBottles)} قنينة ماء ÷ 6` },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl bg-secondary/50 p-3">
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="mt-1 font-extrabold text-primary"><span className="text-2xl tabular-nums">{formatQuantity(stat.value)}</span> <span className="text-sm">{stat.unit}</span></p>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{stat.detail}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs leading-5 text-muted-foreground">الحساب يشمل كامل مبيعات اليوم المحدد، ولا يتأثر بالبحث. يعتمد فقط على «قهوة عادية» و«قهوة دبل» و«قنينة ماء»، ولا يشمل الهدر أو استهلاك المشروبات الأخرى. النتائج مقربة إلى أقرب عدد صحيح، مع احتساب الاستهلاك قبل التقريب.</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardContent className="space-y-3 !p-3 sm:!p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold">تفاصيل الأصناف</h2>
                    <p className="mt-1 text-sm text-muted-foreground">مرتبة افتراضيًا حسب الكمية الأكثر مبيعًا.</p>
                  </div>
                  {report.items.length > 0 ? <div className="flex w-full flex-wrap gap-3 sm:w-auto">
                    <div className="relative min-w-48 flex-1">
                      <label htmlFor="product-search" className="sr-only">البحث باسم الصنف</label>
                      <Search className="pointer-events-none absolute end-3 top-4 size-4 text-muted-foreground" aria-hidden="true" />
                      <Input id="product-search" type="search" placeholder="ابحث باسم الصنف…" className="pe-10" value={search} onChange={(event) => setSearch(event.target.value)} />
                    </div>
                    <div className="w-full sm:w-48">
                      <label htmlFor="product-sort" className="sr-only">ترتيب الأصناف</label>
                      <Select id="product-sort" value={sort} onChange={(event) => setSort(event.target.value)}>
                        <option value="qty">الأكثر مبيعًا بالكمية</option>
                        <option value="total">الأعلى قيمة</option>
                        <option value="name">اسم الصنف</option>
                      </Select>
                    </div>
                  </div> : null}
                </div>

                {report.items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed py-12 text-center" role="status">
                    <Package className="mx-auto mb-3 size-9 text-muted-foreground" aria-hidden="true" />
                    <p className="font-bold">لا توجد مبيعات مكتملة في هذا اليوم</p>
                    <p className="mt-2 text-sm text-muted-foreground">اختر تاريخًا آخر لعرض مبيعات الأصناف.</p>
                  </div>
                ) : items.length === 0 ? (
                  <div className="py-10 text-center" role="status">
                    <p className="text-muted-foreground">لا توجد أصناف تطابق البحث.</p>
                    <Button variant="ghost" onClick={() => setSearch('')}>مسح البحث</Button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground" role="status">عرض {items.length} من {report.items.length} صنف · الملخص يشمل جميع أصناف اليوم</p>
                    <div
                      key={`${activeDate}-${search}-${sort}`}
                      role="region"
                      aria-label="قائمة تفاصيل الأصناف القابلة للتمرير"
                      tabIndex={0}
                      className="max-h-[55dvh] overflow-y-auto overscroll-y-contain rounded-xl p-1 outline-none [scrollbar-gutter:stable] focus-visible:ring-2 focus-visible:ring-ring"
                    >
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {items.map((item) => (
                        <Card key={`${item.product_id}-${item.product_name}`} className="rounded-2xl shadow-none">
                          <CardContent className="flex h-full flex-col !p-3">
                            <div className="flex items-start gap-2">
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"><Package className="size-4" aria-hidden="true" /></span>
                              <h3 className="min-w-0 flex-1 break-words text-sm font-bold leading-6">{item.product_name}</h3>
                            </div>
                            {item.qty === topQty ? <span className="mt-2 flex items-center gap-1 text-xs font-bold text-primary"><TrendingUp className="size-3" aria-hidden="true" /> الأكثر مبيعًا بالكمية</span> : null}
                            <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                              <p><span className="text-3xl font-extrabold tabular-nums text-primary">{item.qty.toLocaleString('ar-LY')}</span><span className="ms-1 text-xs text-muted-foreground">قطعة</span></p>
                              <p className="text-sm font-bold tabular-nums">{formatLyd(item.total_lyd)}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </section>
    </div>
  )
}
