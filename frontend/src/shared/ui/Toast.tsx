import { useEffect } from 'react'
import { CircleCheck, CircleX, LoaderCircle } from 'lucide-react'

import { cn } from '../lib/cn'

export type ToastTone = 'error' | 'success' | 'loading'

export interface ToastMessage {
  tone: ToastTone
  text: string
}

export function Toast({
  message,
  onClose,
  compact = false,
  centered = false,
}: {
  message: ToastMessage | null
  onClose: () => void
  compact?: boolean
  centered?: boolean
}) {
  useEffect(() => {
    if (!message || message.tone === 'loading') {
      return
    }
    const timer = window.setTimeout(onClose, 4000)
    return () => window.clearTimeout(timer)
  }, [message, onClose])

  if (!message) {
    return null
  }

  if (centered) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex min-h-16 items-center justify-center px-4" role={message.tone === 'error' ? 'alert' : 'status'}>
        <div className={cn('flex max-w-md items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold shadow-lg', message.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-border bg-card text-foreground')}>
          {message.tone === 'loading' ? <LoaderCircle className="size-5 shrink-0 animate-spin text-primary" aria-hidden="true" /> : null}
          {message.tone === 'success' ? <CircleCheck className="size-5 shrink-0 text-emerald-700" aria-hidden="true" /> : null}
          {message.tone === 'error' ? <CircleX className="size-5 shrink-0 text-red-700" aria-hidden="true" /> : null}
          <span>{message.text}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        compact
          ? 'fixed top-18 left-4 z-50 w-[min(90vw,21rem)] rounded-xl px-4 py-3 text-sm font-semibold shadow-lg sm:left-6'
          : 'fixed bottom-6 left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 rounded-2xl px-5 py-4 text-center text-lg font-medium shadow-lg',
        message.tone === 'error' ? 'bg-red-700 text-white' : 'bg-emerald-700 text-white',
      )}
      role={message.tone === 'error' ? 'alert' : 'status'}
    >
      {message.text}
    </div>
  )
}
