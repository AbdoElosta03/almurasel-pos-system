import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { ApiError } from '../../../api/errors'
import * as shiftsApi from '../../../api/shifts'
import type { Shift } from '../../../types'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
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

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="الوردية" description="فتح الوردية قبل البيع، ثم إقفالها في النهاية." />
      {error ? <Alert className="mb-4">{error}</Alert> : null}
      <Card>
        <CardContent className="pt-6">
          {shift ? (
            <>
              <CurrentShiftPanel shift={shift} />
              <CloseShiftPanel
                shift={shift}
                onClose={async (closingCashLyd) => {
                  await shiftsApi.closeShift(shift.id, { closing_cash_lyd: closingCashLyd })
                  setShift(null)
                }}
              />
              <Button asChild variant="link" className="mt-4 w-full">
                <Link to="/cashier/pos">الانتقال إلى نقطة البيع</Link>
              </Button>
            </>
          ) : (
            <OpenShiftPanel
              onOpen={async (openingCashLyd) => {
                const opened = await shiftsApi.openShift({ opening_cash_lyd: openingCashLyd })
                setShift(opened)
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
