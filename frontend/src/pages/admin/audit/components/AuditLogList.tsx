import type { AuditLog } from '../../../../types'
import { Card } from '../../../../shared/ui/Card'
import { formatLibyaDateTime } from '../../../../utils/datetime'

const ACTION_LABEL: Record<string, string> = {
  'expense.created': 'إضافة مصروف',
  'expense.deleted': 'حذف مصروف',
}

const ENTITY_LABEL: Record<string, string> = {
  expense: 'مصروف',
}

export function AuditLogList({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) {
    return <p className="text-base text-slate-600">لا توجد أحداث بعد.</p>
  }

  return (
    <ul className="grid gap-3">
      {logs.map((log) => (
        <li key={log.id}>
          <Card>
            <p className="text-lg font-semibold">{ACTION_LABEL[log.action] ?? log.action}</p>
            <p className="text-base text-slate-600">
              {ENTITY_LABEL[log.entity_type] ?? log.entity_type} #{log.entity_id} — {log.actor_username || `مستخدم #${log.actor_id}`}
            </p>
            <p className="text-sm text-slate-500">{formatLibyaDateTime(log.created_at)}</p>
          </Card>
        </li>
      ))}
    </ul>
  )
}
