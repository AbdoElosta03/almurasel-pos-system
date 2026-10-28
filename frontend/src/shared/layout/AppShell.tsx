import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import * as shiftsApi from '../../api/shifts'
import { ApiError } from '../../api/errors'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Icon } from '../ui/Icon'
import { cn } from '../lib/cn'
import logoLight from '../../assets/logo-light.png'

export function AppShell({ title, home, children }: { title: string; home: string; children: ReactNode }) {
  const { user, role, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === home || location.pathname === `${home}/`
  const isPos = location.pathname === '/cashier/pos'
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [logoutChecking, setLogoutChecking] = useState(false)

  const finishLogout = () => {
    setLogoutConfirmOpen(false)
    logout()
    navigate('/login')
  }

  const onLogout = () => {
    if (role !== 'cashier') {
      finishLogout()
      return
    }
    setLogoutChecking(true)
    void shiftsApi.currentShift()
      .then(() => {
        setLogoutConfirmOpen(true)
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404 && err.code === 'no_open_shift') {
          finishLogout()
          return
        }
        finishLogout()
      })
      .finally(() => {
        setLogoutChecking(false)
      })
  }

  const goBack = () => {
    const historyIndex = window.history.state?.idx
    if (typeof historyIndex === 'number' && historyIndex > 0) {
      navigate(-1)
    } else {
      navigate(location.pathname.startsWith('/cashier/invoices/') ? '/cashier/invoices' : home)
    }
  }

  const backButton = !isHome ? (
    <Button
      type="button"
      size="lg"
      onClick={goBack}
      aria-label="العودة إلى الصفحة السابقة"
      title="رجوع"
      className={cn('fixed right-5 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 rounded-full px-6 shadow-lg shadow-primary/25 sm:right-6', isPos && 'bottom-[calc(6.5rem+env(safe-area-inset-bottom))] lg:bottom-[calc(3.5rem+env(safe-area-inset-bottom))]')}
    >
      <Icon name="arrow" className="size-5 rotate-180" />
      الرجوع إلى الخلف
    </Button>
  ) : null

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="relative z-10 border-b border-border bg-card px-4 py-2 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <Link to={home} className="flex min-h-12 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="العودة إلى الرئيسية">
            <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-xl bg-primary">
              <img src={logoLight} alt="" className="h-full w-full object-contain" />
            </span>
            <span>
              <span className="block text-lg font-extrabold leading-tight text-foreground">المراسل <span className="text-primary">POS</span></span>
              <span className="block text-xs font-medium text-muted-foreground">{title}</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            {!isHome && (
              <Button asChild variant="outline" size="default">
                <Link to={home}>
                  <Icon name="home" className="size-5" />
                  <span>الرئيسية</span>
                </Link>
              </Button>
            )}
            <span className="hidden h-10 w-px bg-border sm:block" />
            <span className="hidden text-sm font-semibold text-foreground sm:block">{user?.username}</span>
            <Button variant="ghost" onClick={onLogout} disabled={logoutChecking}>
              <Icon name="logout" className="size-5" /> خروج
            </Button>
          </div>
        </div>
      </header>
      <main className={cn('mx-auto flex w-full max-w-[1600px] flex-1 flex-col p-4 sm:p-6', isPos && 'lg:h-[calc(100dvh-4rem)] lg:min-h-0 lg:flex-none lg:overflow-hidden lg:px-5 lg:py-3')}>{children}</main>
      {backButton}
      <ConfirmDialog
        open={logoutConfirmOpen}
        title="الوردية لا تزال مفتوحة"
        description="الوردية لا تزال مفتوحة. هل تريد تسجيل الخروج؟"
        confirmLabel="نعم، تسجيل الخروج"
        cancelLabel="رجوع"
        confirmVariant="destructive"
        onConfirm={finishLogout}
        onClose={() => setLogoutConfirmOpen(false)}
      />
    </div>
  )
}
