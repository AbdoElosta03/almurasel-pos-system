import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/button'
import { Icon } from '../ui/Icon'
import { cn } from '../lib/cn'

export function AppShell({ title, home, children }: { title: string; home: string; children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === home || location.pathname === `${home}/`
  const isPos = location.pathname === '/cashier/pos'

  const onLogout = () => {
    logout()
    navigate('/login')
  }

  const goBack = () => {
    const historyIndex = window.history.state?.idx
    if (typeof historyIndex === 'number' && historyIndex > 0) {
      navigate(-1)
    } else {
      navigate(home)
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="relative z-10 border-b border-border bg-card px-4 py-2 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <Link to={home} className="flex min-h-12 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="العودة إلى الرئيسية">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Icon name="store" className="size-5" />
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
            <Button variant="ghost" onClick={onLogout}>
              <Icon name="logout" className="size-5" /> خروج
            </Button>
          </div>
        </div>
      </header>
      <main className={cn('mx-auto flex w-full max-w-[1600px] flex-1 flex-col p-4 sm:p-6', isPos && 'lg:h-[calc(100dvh-4rem)] lg:min-h-0 lg:flex-none lg:overflow-hidden lg:px-5 lg:py-3')}>{children}</main>
      {!isHome ? (
        <Button
          type="button"
          size="icon-lg"
          onClick={goBack}
          aria-label="العودة إلى الصفحة السابقة"
          title="رجوع"
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] end-5 z-40 rounded-full shadow-lg shadow-primary/25 sm:end-6"
        >
          <Icon name="arrow" className="size-6 rotate-180" />
        </Button>
      ) : null}
    </div>
  )
}
