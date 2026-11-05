import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Copy, KeyRound, ShieldCheck } from 'lucide-react'

import * as licenseApi from '../../api/license'
import { ApiError } from '../../api/errors'
import { useLicense } from '../../context/LicenseContext'
import { Alert } from '../../shared/ui/Alert'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import logoLight from '../../assets/logo-light.png'

const LOCK_MESSAGE: Record<string, string> = {
  license_required: 'أدخل رمز التفعيل لفتح المنظومة على هذا الجهاز.',
  license_expired: 'انتهت مدة التفعيل. الصق رمزًا جديدًا للمتابعة.',
  clock_tampered: 'تاريخ الجهاز تغيّر إلى الوراء. صحّح الساعة ثم أدخل رمز التفعيل إن لزم.',
}

export function ActivatePage() {
  const { status, refresh } = useLicense()
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!token.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      await licenseApi.activateLicense(token.trim())
      await refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر تفعيل الرمز')
    } finally {
      setBusy(false)
    }
  }

  const copyMachineId = async () => {
    const machineId = status?.machine_id?.trim()
    if (!machineId) return
    try {
      await navigator.clipboard.writeText(machineId)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('تعذر نسخ رقم الجهاز')
    }
  }

  const reason = status?.lock_reason ?? 'license_required'

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-x-hidden bg-background px-4 py-8 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_15%,#d8eee7,transparent_48%)] opacity-80" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_85%,#dceeed,transparent_48%)] opacity-70" />
      <div className="relative z-10 w-full max-w-xl space-y-5 rounded-[2.5rem] border border-white/80 bg-card/95 p-5 shadow-[0_28px_80px_-24px_rgba(18,83,78,0.22)] backdrop-blur-sm sm:p-7">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-16 items-center justify-center rounded-xl bg-primary">
            <img src={logoLight} alt="" className="h-full w-full object-contain" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">المراسل <span className="text-primary">POS</span></h1>
            <p className="text-sm text-muted-foreground">تفعيل المنظومة</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-secondary/30 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{LOCK_MESSAGE[reason] ?? LOCK_MESSAGE.license_required}</p>
          </div>
          {status?.machine_id ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-bold text-muted-foreground">رقم الجهاز</p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 select-all break-all rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs text-foreground">
                  {status.machine_id}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => void copyMachineId()}
                  aria-label="نسخ رقم الجهاز"
                >
                  {copied ? <Check className="size-4 text-emerald-700" /> : <Copy className="size-4" />}
                  {copied ? 'تم النسخ' : 'نسخ'}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="license-token" className="flex items-center gap-2 font-bold">
              <KeyRound className="size-4 text-primary" aria-hidden="true" />
              رمز التفعيل
            </Label>
            <textarea
              id="license-token"
              value={token}
              disabled={busy}
              rows={5}
              placeholder="الصق الرمز الكامل هنا"
              onChange={(event) => setToken(event.target.value)}
              className="w-full rounded-2xl border border-input bg-background px-4 py-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:opacity-50"
            />
          </div>
          {error ? <Alert>{error}</Alert> : null}
          <Button type="submit" size="lg" className="w-full rounded-2xl" loading={busy} disabled={!token.trim()}>
            تفعيل المنظومة
          </Button>
        </form>
      </div>
    </div>
  )
}
