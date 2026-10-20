import { useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { Alert } from '../../shared/ui/Alert'
import { LoadingBlock } from '../../shared/ui/LoadingBlock'
import { LoginForm } from './components/LoginForm'
import { AdminRecoveryDialog } from './components/AdminRecoveryDialog'
import logoLight from '../../assets/logo-light.png'

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
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background p-4 relative overflow-hidden select-none">
      {/* Stunning abstract radial gradients for a professional subtle background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,#e7f3ef,transparent_55%)] opacity-70" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,#dceeed,transparent_55%)] opacity-70" />
      
      {/* Medium size card, perfectly centered */}
      <div className="relative z-10 w-full max-w-md space-y-8 rounded-[2.5rem] border border-border bg-card p-8 shadow-[0_24px_64px_-16px_rgba(18,83,78,0.12)] motion-safe:animate-fade-in sm:p-10">
        
        {/* Header Section: Logo & System Title */}
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Logo container with brand primary background */}
          <button type="button" onClick={handleLogoClick} aria-label="شعار المراسل" className="flex h-24 w-36 items-center justify-center rounded-[1.75rem] bg-primary shadow-lg shadow-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <img src={logoLight} alt="" className="h-full w-full object-contain" />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">المراسل <span className="text-primary font-black">POS</span></h1>
            <p className="text-base text-muted-foreground mt-1.5 font-medium">سجّل الدخول للمتابعة إلى مساحة العمل</p>
          </div>
        </div>

        {/* Login Form Container */}
        {recoverySuccess ? <Alert tone="success">تم تغيير كلمة المرور. سجّل الدخول بكلمة المرور الجديدة.</Alert> : null}
        <div className="motion-safe:animate-fade-in" style={{ animationDelay: '100ms' }}>
          <LoginForm />
        </div>

        {/* Footer info inside the card */}
        <p className="text-center text-xs text-muted-foreground pt-2 border-t border-border/60">
          نظام المراسل لنقاط البيع الذكية · إصدار 1.0.0
        </p>
      </div>
      <AdminRecoveryDialog open={recoveryOpen} onClose={() => setRecoveryOpen(false)} onRecovered={() => { setRecoveryOpen(false); setRecoverySuccess(true) }} />
    </div>
  )
}
