import { useEffect, useState } from 'react'

import { ApiError } from '../../../api/errors'
import * as auditApi from '../../../api/audit'
import type { AuditLog } from '../../../types'
import { Alert } from '../../../shared/ui/Alert'
import { LoadingBlock } from '../../../shared/ui/LoadingBlock'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { AuditLogList } from './components/AuditLogList'

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void auditApi
      .listAuditLogs()
      .then(setLogs)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'تعذر تحميل السجل'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <LoadingBlock />
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="سجل النشاط" description="إنشاء وإلغاء الفواتير." />
      {error ? <Alert className="mb-4">{error}</Alert> : null}
      <AuditLogList logs={logs} />
    </div>
  )
}
