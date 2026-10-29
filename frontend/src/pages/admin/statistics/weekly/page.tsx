import { useEffect, useState } from 'react'

import { ApiError } from '../../../../api/errors'
import * as reportsApi from '../../../../api/reports'
import type { WeeklySales } from '../../../../types'
import { Alert } from '../../../../shared/ui/Alert'
import { PageHeader } from '../../../../shared/ui/PageHeader'
import { Button } from '../../../../components/ui/button'
import { Card, CardContent } from '../../../../components/ui/card'
import { formatLyd, toLydNumber } from '../../../../utils/money'

const MAX_WEEK_OFFSET = 104

function parseIsoDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatRange(start: string, end: string) {
  const from = parseIsoDate(start)
  const to = parseIsoDate(end)
  const dayMonth = new Intl.DateTimeFormat('ar-LY', { day: 'numeric', month: 'long' })
  const withYear = new Intl.DateTimeFormat('ar-LY', { day: 'numeric', month: 'long', year: 'numeric' })
  if (from.getFullYear() === to.getFullYear()) {
    return `${dayMonth.format(from)} – ${withYear.format(to)}`
  }
  return `${withYear.format(from)} – ${withYear.format(to)}`
}

function weekTitle(offset: number) {
  if (offset === 0) return 'هذا الأسبوع'
  if (offset === 1) return 'الأسبوع السابق'
  if (offset === 2) return 'قبل أسبوعين'
  return `قبل ${offset} أسابيع`
}

function WeekdayChart({ report }: { report: WeeklySales }) {
  const max = Math.max(...report.days.map((day) => toLydNumber(day.total_lyd)), 0)
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[36rem] grid-cols-7 items-end gap-2 sm:gap-3" role="img" aria-label="مبيعات أيام الأسبوع">
        {report.days.map((day) => {
          const amount = toLydNumber(day.total_lyd)
          const height = max === 0 || amount === 0 ? 0 : Math.max(8, Math.round((amount / max) * 100))
          return (
            <div key={day.weekday} className="flex min-w-0 flex-col items-center gap-2">
              <span className="text-center text-[11px] font-bold leading-tight text-primary sm:text-xs">
                {amount > 0 ? formatLyd(amount) : '—'}
              </span>
              <div className="flex h-48 w-full items-end rounded-xl bg-secondary/70 px-1.5 sm:h-64">
                <div
                  className="w-full rounded-t-lg bg-primary"
                  style={{ height: `${height}%` }}
                  title={`${day.label}: ${formatLyd(amount)}`}
                />
              </div>
              <span className="text-center text-xs font-extrabold sm:text-sm">{day.label}</span>
              <span className="text-[11px] text-muted-foreground">{day.count} فاتورة</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function WeeklySalesPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [report, setReport] = useState<WeeklySales | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void reportsApi.weeklySales(weekOffset)
      .then((data) => {
        if (!cancelled) setReport(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setReport(null)
        setError(err instanceof ApiError ? err.message : 'تعذر تحميل الإحصائية')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [weekOffset])

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-7 sm:w-[calc(100%-2rem)]">
      <div className="border-b border-border/60 pb-2">
        <PageHeader
          title="إحصائيات مبيعات أسبوعية"
          description="إجمالي المبيعات المكتملة لكل يوم. الأسبوع من السبت إلى الجمعة."
        />
      </div>
      <Card className="overflow-hidden rounded-2xl shadow-[0_12px_35px_-28px_rgba(18,83,78,.35)]">
        <CardContent className="space-y-6 !p-4 sm:!p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setWeekOffset((current) => Math.min(MAX_WEEK_OFFSET, current + 1))}
              disabled={weekOffset >= MAX_WEEK_OFFSET}
            >
              الأسبوع السابق
            </Button>
            <div className="min-w-40 text-center">
              <p className="text-lg font-extrabold">{weekTitle(weekOffset)}</p>
              {report ? <p className="text-sm text-muted-foreground">{formatRange(report.week_start, report.week_end)}</p> : null}
            </div>
            <Button variant="outline" onClick={() => setWeekOffset((current) => Math.max(0, current - 1))} disabled={weekOffset === 0}>
              الأسبوع التالي
            </Button>
          </div>
          {error ? <Alert>{error}</Alert> : null}
          {loading ? <p className="text-base text-muted-foreground">جاري التحميل...</p> : null}
          {report && !loading ? (
            <>
              <WeekdayChart report={report} />
              <p className="rounded-2xl bg-secondary px-4 py-4 text-base font-bold leading-8 text-secondary-foreground">
                {report.insights.summary}
              </p>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
