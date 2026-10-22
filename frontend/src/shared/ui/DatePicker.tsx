import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '../lib/cn'

const WEEKDAYS = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج']

function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

function dateValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function dateLabel(value: string, placeholder: string): string {
  const date = parseDate(value)
  if (!date) return placeholder
  return date.toLocaleDateString('ar-LY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function sameDay(first: Date, second: Date): boolean {
  return dateValue(first) === dateValue(second)
}

export function DatePicker({
  id,
  value,
  onChange,
  disabled = false,
  placeholder = 'اختر التاريخ',
  className,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}) {
  const selected = useMemo(() => parseDate(value), [value])
  const [open, setOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = selected ?? new Date()
    return new Date(initial.getFullYear(), initial.getMonth(), 1)
  })
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const initial = selected ?? new Date()
    setVisibleMonth(new Date(initial.getFullYear(), initial.getMonth(), 1))

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(320, window.innerWidth - 24)
      const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))
      const panelHeight = 390
      const below = rect.bottom + 8
      const top = below + panelHeight <= window.innerHeight
        ? below
        : Math.max(12, rect.top - panelHeight - 8)
      setPosition({ top, left })
    }

    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false)
      }
    }

    updatePosition()
    document.addEventListener('pointerdown', closeOnOutside)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, selected])

  const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
  const leading = (firstDay.getDay() + 1) % 7
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: leading + daysInMonth }, (_, index) =>
    index < leading ? null : new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), index - leading + 1),
  )
  const today = new Date()

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex h-12 w-full items-center justify-between gap-3 rounded-xl border border-input bg-card px-4 text-right text-base font-semibold text-foreground outline-none transition-all hover:border-primary/40 hover:bg-secondary/30 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      >
        <span className={value ? undefined : 'text-muted-foreground'}>{dateLabel(value, placeholder)}</span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <CalendarDays className="size-4" />
        </span>
      </button>

      {open ? createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label="اختيار التاريخ"
          dir="rtl"
          className="fixed z-[100] w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-card p-4 text-foreground shadow-[0_24px_60px_-18px_rgba(18,83,78,.35)]"
          style={{ top: position.top, left: position.left }}
        >
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              aria-label="الشهر السابق"
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              className="flex size-10 items-center justify-center rounded-xl text-primary hover:bg-secondary"
            >
              <ChevronRight className="size-5" />
            </button>
            <p className="font-extrabold">
              {visibleMonth.toLocaleDateString('ar-LY', { month: 'long', year: 'numeric' })}
            </p>
            <button
              type="button"
              aria-label="الشهر التالي"
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              className="flex size-10 items-center justify-center rounded-xl text-primary hover:bg-secondary"
            >
              <ChevronLeft className="size-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <span key={day} className="flex h-8 items-center justify-center text-xs font-bold text-muted-foreground">
                {day}
              </span>
            ))}
            {cells.map((day, index) => day ? (
              <button
                key={dateValue(day)}
                type="button"
                aria-label={day.toLocaleDateString('ar-LY')}
                aria-pressed={selected ? sameDay(day, selected) : false}
                onClick={() => {
                  onChange(dateValue(day))
                  setOpen(false)
                }}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-xl text-sm font-bold transition-colors hover:bg-secondary hover:text-primary',
                  sameDay(day, today) && 'ring-1 ring-inset ring-primary/40',
                  selected && sameDay(day, selected) && 'bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground',
                )}
              >
                {day.toLocaleDateString('ar-LY', { day: 'numeric' })}
              </button>
            ) : <span key={`empty-${index}`} />)}
          </div>

          <button
            type="button"
            onClick={() => {
              const current = new Date()
              onChange(dateValue(current))
              setOpen(false)
            }}
            className="mt-3 h-10 w-full rounded-xl bg-secondary text-sm font-bold text-primary hover:bg-secondary/70"
          >
            اليوم
          </button>
        </div>,
        document.body,
      ) : null}
    </>
  )
}
