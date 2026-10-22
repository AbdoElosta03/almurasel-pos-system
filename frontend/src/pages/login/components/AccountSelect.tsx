import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ShieldCheck, UserRound } from 'lucide-react'

import type { LoginAccount } from '../../../types'

const VISIBLE_ACCOUNT_ROWS = 4
/** ارتفاع صف الحساب في القائمة (px) — يُستخدم لتحديد ارتفاع السكرول بعد 4 حسابات */
const ACCOUNT_ROW_HEIGHT_PX = 60

function roleLabel(role: string) {
  return role === 'admin' ? 'مدير النظام' : 'كاشير'
}

export function AccountSelect({
  accounts,
  value,
  onChange,
  disabled,
}: {
  accounts: LoginAccount[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = accounts.find((account) => account.username === value)

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [])

  return (
    <div ref={rootRef} className="relative">
      <button
        id="username"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
        className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-border bg-background px-4 text-right shadow-sm transition hover:border-primary/40 hover:bg-secondary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {selected?.role === 'admin' ? <ShieldCheck className="size-5" /> : <UserRound className="size-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-extrabold text-foreground">
            {selected?.username ?? 'لا توجد حسابات نشطة'}
          </span>
          {selected ? (
            <span className="mt-0.5 block text-sm font-medium text-muted-foreground">{roleLabel(selected.role)}</span>
          ) : null}
        </span>
        <ChevronDown className={`size-5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="الحساب"
          className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-popover p-2 shadow-xl [scrollbar-width:thin]"
          style={{
            maxHeight:
              accounts.length > VISIBLE_ACCOUNT_ROWS
                ? ACCOUNT_ROW_HEIGHT_PX * VISIBLE_ACCOUNT_ROWS + 16
                : undefined,
          }}
        >
          {accounts.map((account) => {
            const active = account.username === value
            return (
              <button
                key={account.username}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(account.username)
                  setOpen(false)
                }}
                className={`flex min-h-[60px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right transition ${
                  active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary/60'
                }`}
              >
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                  {account.role === 'admin' ? <ShieldCheck className="size-4.5" /> : <UserRound className="size-4.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">{account.username}</span>
                  <span className="block text-xs font-medium text-muted-foreground">{roleLabel(account.role)}</span>
                </span>
                {active ? <Check className="size-5 shrink-0" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
