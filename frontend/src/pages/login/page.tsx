import { useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { Alert } from '../../shared/ui/Alert'
import { LoadingBlock } from '../../shared/ui/LoadingBlock'
import { LoginForm } from './components/LoginForm'
import { AdminRecoveryDialog } from './components/AdminRecoveryDialog'

export function LoginPage() {
  const { user, loading } = useAuth()
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [recoverySuccess, setRecoverySuccess] = useState(false)
  const logoClicks = useRef({ count: 0, lastClick: 0 })

  const handleLogoClick = () => {
    const now = Date.now()
    logoClicks.current.count = now - logoClicks.current.lastClick < 1200 ? logoClicks.current.count + 1 : 1
    logoClicks.current.lastClick = now
    if (logoClicks.current.count >= 3) {
      logoClicks.current.count = 0
      setRecoveryOpen(true)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <LoadingBlock />
      </div>
    )
  }
  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/cashier'} replace />
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-x-hidden bg-background px-4 py-8 select-none sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_15%,#d8eee7,transparent_48%)] opacity-80" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_85%,#dceeed,transparent_48%)] opacity-70" />
      <div className="absolute top-[-10rem] left-[-8rem] size-80 rounded-full border-[3rem] border-primary/5" />
      <div className="absolute right-[-6rem] bottom-[-8rem] size-64 rounded-full bg-primary/5" />

      <div className="relative z-10 w-full max-w-5xl space-y-5 rounded-[2.5rem] border border-white/80 bg-card/95 p-5 shadow-[0_28px_80px_-24px_rgba(18,83,78,0.22)] backdrop-blur-sm motion-safe:animate-fade-in sm:p-7 lg:p-9">
        {recoverySuccess ? (
          <Alert tone="success">تم تغيير كلمة المرور. سجّل الدخول بالرمز الجديد.</Alert>
        ) : null}
        <div className="motion-safe:animate-fade-in" style={{ animationDelay: '100ms' }}>
          <LoginForm onLogoClick={handleLogoClick} />
        </div>
        <p className="border-t border-border/50 pt-4 text-center text-xs font-medium text-muted-foreground">
          نظام المراسل لنقاط البيع الذكية · إصدار 1.0.0
        </p>
      </div>
      <AdminRecoveryDialog
        open={recoveryOpen}
        onClose={() => setRecoveryOpen(false)}
        onRecovered={() => {
          setRecoveryOpen(false)
          setRecoverySuccess(true)
        }}
      />
    </div>
  )
}
