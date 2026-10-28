import type { AuditLog } from '../../../../types'
import { Card } from '../../../../shared/ui/Card'
import { formatLibyaDateTime } from '../../../../utils/datetime'

export function AuditLogList({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) {
    return <p className="text-base text-slate-600">لا توجد أحداث بعد.</p>
  }

  return (
    <ul className="grid gap-3">
      {logs.map((log) => (
        <li key={log.id}>
          <Card>
            <p className="text-lg font-semibold">{log.action}</p>
            <p className="text-base text-slate-600">
              {log.entity_type} #{log.entity_id} — مستخدم #{log.actor_id}
            </p>
            <p className="text-sm text-slate-500">{formatLibyaDateTime(log.created_at)}</p>
          </Card>
        </li>
      ))}
    </ul>
  )
}
