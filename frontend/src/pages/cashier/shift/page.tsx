import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock3, ShoppingCart } from 'lucide-react'

import { ApiError } from '../../../api/errors'
import * as shiftsApi from '../../../api/shifts'
import type { Shift } from '../../../types'
import { formatLibyaDateTime, isOpenedOnPreviousLibyaDay } from '../../../utils/datetime'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Alert } from '../../../shared/ui/Alert'
import { LoadingBlock } from '../../../shared/ui/LoadingBlock'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { CloseShiftPanel } from './components/CloseShiftPanel'
import { CurrentShiftPanel } from './components/CurrentShiftPanel'
import { OpenShiftPanel } from './components/OpenShiftPanel'

export function ShiftPage() {
  const [shift, setShift] = useState<Shift | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setShift(await shiftsApi.currentShift())
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setShift(null)
        return
      }
      throw err
    }
  }, [])

  useEffect(() => {
    void load()
      .catch((err) => setError(err instanceof ApiError ? err.message : 'تعذر تحميل الوردية'))
      .finally(() => setLoading(false))
  }, [load])

  if (loading) {
    return <LoadingBlock />
  }

  const staleShift = shift !== null && isOpenedOnPreviousLibyaDay(shift.opened_at)

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="border-b border-border/60 pb-3">
        <PageHeader title="الوردية" description="إدارة ورديتك ونقدية الصندوق في مكان واحد." />
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {shift ? (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.8fr)]">
          <div className="space-y-4">
            {staleShift ? (
              <Alert>
                وردية من يوم سابق ما زالت مفتوحة (فُتحت في {formatLibyaDateTime(shift.opened_at)}).
                أقفلها بعد عدّ الدرج قبل البيع أو فتح وردية جديدة.
              </Alert>
            ) : null}
            <CurrentShiftPanel shift={shift} />
            {!staleShift ? (
              <Card className="flex items-center justify-between gap-4 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                    <ShoppingCart className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-bold">جاهز للبيع؟</h3>
                    <p className="text-sm text-muted-foreground">ابدأ تسجيل الطلبات خلال هذه الوردية.</p>
                  </div>
                </div>
                <Button asChild className="shrink-0">
                  <Link to="/cashier/pos">نقطة البيع <ArrowLeft className="size-4" /></Link>
                </Button>
              </Card>
            ) : null}
          </div>
          <Card className="p-5 sm:p-6">
            <CloseShiftPanel
              shift={shift}
              onClose={async (closingCashLyd) => {
                await shiftsApi.closeShift(shift.id, { closing_cash_lyd: closingCashLyd })
                setShift(null)
              }}
            />
          </Card>
        </div>
      ) : (
        <div className="mx-auto max-w-xl space-y-4">
          <Card className="flex items-center gap-4 border-primary/20 bg-secondary/40 p-5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Clock3 className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-lg font-bold">لا توجد وردية مفتوحة</h3>
              <p className="text-sm text-muted-foreground">افتح وردية لتتمكن من استخدام نقطة البيع.</p>
            </div>
          </Card>
          <Card className="p-5 sm:p-6">
            <OpenShiftPanel
              onOpen={async (openingCashLyd) => {
                const opened = await shiftsApi.openShift({ opening_cash_lyd: openingCashLyd })
                setShift(opened)
              }}
            />
          </Card>
        </div>
      )}
    </div>
  )
}
