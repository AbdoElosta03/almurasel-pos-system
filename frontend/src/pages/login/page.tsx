import { Navigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { LoadingBlock } from '../../shared/ui/LoadingBlock'
import { LoginForm } from './components/LoginForm'

export function LoginPage() {
  const { user, loading } = useAuth()

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
          <div className="relative flex items-center justify-center size-20 rounded-[1.75rem] bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <svg viewBox="0 0 100 100" className="size-12 drop-shadow-[0_2px_6px_rgba(0,0,0,0.2)]">
              <defs>
                <linearGradient id="accent-grad-login" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#dfaa57" />
                  <stop offset="100%" stop-color="#f5ca8c" />
                </linearGradient>
              </defs>
              <path d="M25 32H75" stroke="#ffffff" stroke-width="5" stroke-linecap="round" />
              <path d="M35 45C35 40 43 40 47 44C51 48 47 58 39 64H71" stroke="url(#accent-grad-login)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
              <line x1="43" y1="52" x2="57" y2="52" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
              <path d="M75 50L77 56L83 58L77 60L75 66L73 60L67 58L73 56Z" fill="#dfaa57" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">المراسل <span className="text-primary font-black">POS</span></h1>
            <p className="text-base text-muted-foreground mt-1.5 font-medium">سجّل الدخول للمتابعة إلى مساحة العمل</p>
          </div>
        </div>

        {/* Login Form Container */}
        <div className="motion-safe:animate-fade-in" style={{ animationDelay: '100ms' }}>
          <LoginForm />
        </div>

        {/* Footer info inside the card */}
        <p className="text-center text-xs text-muted-foreground pt-2 border-t border-border/60">
          نظام المراسل لنقاط البيع الذكية · إصدار 1.0.0
        </p>
      </div>
    </div>
  )
}
