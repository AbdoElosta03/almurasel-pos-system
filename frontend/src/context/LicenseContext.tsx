import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import * as licenseApi from '../api/license'
import type { LicenseStatus } from '../types'
import { LoadingBlock } from '../shared/ui/LoadingBlock'

interface LicenseContextValue {
  status: LicenseStatus | null
  loading: boolean
  refresh: () => Promise<LicenseStatus>
  markLocked: () => void
}

const LicenseContext = createContext<LicenseContextValue | null>(null)

const lockedFallback = (partial?: Partial<LicenseStatus>): LicenseStatus => ({
  active: false,
  enforced: true,
  plan: partial?.plan ?? null,
  expires_at: partial?.expires_at ?? null,
  days_remaining: partial?.days_remaining ?? null,
  warning: false,
  machine_id: partial?.machine_id ?? '',
  lock_reason: partial?.lock_reason ?? 'license_required',
})

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LicenseStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const next = await licenseApi.fetchLicenseStatus()
    setStatus(next)
    return next
  }, [])

  const markLocked = useCallback(() => {
    setStatus((current) => lockedFallback(current ?? undefined))
  }, [])

  useEffect(() => {
    let active = true
    void refresh()
      .catch(() => {
        if (active) setStatus(lockedFallback())
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    const onLock = () => {
      markLocked()
      void refresh().catch(() => markLocked())
    }
    window.addEventListener('almurasel-license-lock', onLock)
    return () => {
      active = false
      window.removeEventListener('almurasel-license-lock', onLock)
    }
  }, [markLocked, refresh])

  const value = useMemo(
    () => ({ status, loading, refresh, markLocked }),
    [status, loading, refresh, markLocked],
  )

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <LoadingBlock />
      </div>
    )
  }

  return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>
}

export function useLicense() {
  const context = useContext(LicenseContext)
  if (!context) {
    throw new Error('useLicense must be used inside LicenseProvider')
  }
  return context
}
