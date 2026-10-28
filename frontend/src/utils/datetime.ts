/** Backend stores naive UTC; display everything in Libya wall time. */
export const LIBYA_TIME_ZONE = 'Africa/Tripoli'

export function parseApiDateTime(value: string): Date {
  const trimmed = value.trim()
  if (!trimmed) return new Date(NaN)
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    return new Date(trimmed)
  }
  const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T')
  return new Date(`${normalized}Z`)
}

export function formatLibyaDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = parseApiDateTime(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('ar-LY', {
    timeZone: LIBYA_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatLibyaTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = parseApiDateTime(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('ar-LY', {
    timeZone: LIBYA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  })
}

function libyaCalendarDayKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: LIBYA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** True when the shift was opened on an earlier Libya calendar day than today. */
export function isOpenedOnPreviousLibyaDay(openedAt: string): boolean {
  const opened = parseApiDateTime(openedAt)
  if (Number.isNaN(opened.getTime())) return false
  return libyaCalendarDayKey(opened) < libyaCalendarDayKey(new Date())
}
