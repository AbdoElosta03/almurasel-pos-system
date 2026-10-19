import { useEffect } from 'react'

import { cn } from '../lib/cn'

export type ToastTone = 'error' | 'success'

export interface ToastMessage {
  tone: ToastTone
  text: string
}

export function Toast({
  message,
  onClose,
  compact = false,
}: {
  message: ToastMessage | null
  onClose: () => void
  compact?: boolean
}) {
  useEffect(() => {
    if (!message) {
      return
    }
    const timer = window.setTimeout(onClose, 4000)
    return () => window.clearTimeout(timer)
  }, [message, onClose])

  if (!message) {
    return null
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
