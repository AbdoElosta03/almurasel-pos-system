import { useRef } from 'react'
import { CalendarDays } from 'lucide-react'

import type { ReportStatus, User } from '../../../../types'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import { Select } from '../../../../shared/ui/Select'

const statuses: { id: ReportStatus; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'completed', label: 'مكتملة' },
  { id: 'cancelled', label: 'ملغاة' },
]

function formatDateLabel(value: string) {
  if (!value) return 'اختر التاريخ'
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Date(year, month - 1, day).toLocaleDateString('ar-LY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function DateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const openPicker = () => {
    const input = inputRef.current
    if (!input) return
    if (typeof input.showPicker === 'function') {
      input.showPicker()
    } else {
      input.click()
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <button
          type="button"
          onClick={openPicker}
          className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-input bg-card px-3 text-right text-sm font-semibold text-foreground outline-none transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
        >
          <span>{formatDateLabel(value)}</span>
          <CalendarDays className="size-4 shrink-0 text-primary" />
        </button>
        <input
          ref={inputRef}
          id={id}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="pointer-events-none absolute bottom-0 left-0 size-px opacity-0"
          tabIndex={-1}
        />
      </div>
    </div>
  )
}

export function ReportFilters({
  dateFrom,
  dateTo,
  cashierId,
  shiftId,
  status,
  users,
  onDateFromChange,
  onDateToChange,
  onCashierChange,
  onShiftIdChange,
  onStatusChange,
  onApply,
}: {
  dateFrom: string
  dateTo: string
  cashierId: string
  shiftId: string
  status: ReportStatus
  users: User[]
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
  onCashierChange: (value: string) => void
  onShiftIdChange: (value: string) => void
  onStatusChange: (value: ReportStatus) => void
  onApply: () => void
}) {
  return (
    <div className="grid grid-cols-[repeat(6,minmax(0,1fr))] items-end gap-2 [&>*]:min-w-0">
        <DateField id="report-from" label="من" value={dateFrom} onChange={onDateFromChange} />
        <DateField id="report-to" label="إلى" value={dateTo} onChange={onDateToChange} />
        <div className="space-y-2">
          <Label htmlFor="report-cashier">المستخدم</Label>
          <Select className="h-11 min-h-11 rounded-xl px-3 text-sm" id="report-cashier" value={cashierId} onChange={(event) => onCashierChange(event.target.value)}>
            <option value="">كل المستخدمين</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.username}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="report-status">حالة الفاتورة</Label>
          <Select className="h-11 min-h-11 rounded-xl px-3 text-sm" id="report-status" value={status} onChange={(event) => onStatusChange(event.target.value as ReportStatus)}>
            {statuses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="report-shift">رقم الوردية</Label>
          <Input
            id="report-shift"
            type="number"
            min={1}
            placeholder="اختياري"
            className="h-11 min-h-11 rounded-xl px-3 text-sm"
            value={shiftId}
            onChange={(event) => onShiftIdChange(event.target.value)}
          />
        </div>
        <Button onClick={onApply} className="h-11 min-h-11 w-full rounded-xl px-5">
          عرض التقرير
        </Button>
    </div>
  )
}
