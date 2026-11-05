import { useState } from 'react'
import type { FormEvent } from 'react'
import { ShieldCheck } from 'lucide-react'

import * as licenseApi from '../../../../api/license'
import { ApiError } from '../../../../api/errors'
import { useLicense } from '../../../../context/LicenseContext'
import { Alert } from '../../../../shared/ui/Alert'
import { Button } from '../../../../components/ui/button'
import { Card } from '../../../../shared/ui/Card'
import { Label } from '../../../../components/ui/label'
import { LICENSE_PLAN_LABEL, formatLicenseExpiry } from '../../../../utils/licenseLabels'

export function LicenseCard() {
  const { status, refresh } = useLicense()
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (!status) return null

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!token.trim() || busy) return
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await licenseApi.activateLicense(token.trim())
      await refresh()
      setToken('')
      setSuccess('تم تحديث التفعيل بنجاح')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر تحديث التفعيل')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
          <ShieldCheck className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-lg font-bold">التفعيل</h3>
          <p className="text-sm text-muted-foreground">
            {status.enforced
              ? 'حالة الترخيص على هذا الجهاز. يمكنك لصق رمز تجديد دون إيقاف البيع.'
              : 'قفل التفعيل مطفأ على هذا الجهاز (وضع التطوير).'}
          </p>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-border bg-secondary/30 p-4 text-sm sm:grid-cols-2">
        <p>الخطة: <strong>{status.plan ? LICENSE_PLAN_LABEL[status.plan] : '—'}</strong></p>
        <p>الانتهاء: <strong>{formatLicenseExpiry(status.expires_at)}</strong></p>
        {status.days_remaining != null ? <p>الأيام المتبقية: <strong>{status.days_remaining}</strong></p> : null}
        <p className="break-all sm:col-span-2">رقم الجهاز: <strong className="font-mono text-xs">{status.machine_id || '—'}</strong></p>
      </div>

      {status.enforced ? (
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="settings-license-token">رمز تجديد</Label>
            <textarea
              id="settings-license-token"
              value={token}
              disabled={busy}
              rows={3}
              placeholder="الصق رمز التفعيل الجديد"
              onChange={(event) => setToken(event.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:opacity-50"
            />
          </div>
          {error ? <Alert>{error}</Alert> : null}
          {success ? <Alert tone="success">{success}</Alert> : null}
          <Button type="submit" disabled={!token.trim()} loading={busy}>تحديث التفعيل</Button>
        </form>
      ) : null}
    </Card>
  )
}
