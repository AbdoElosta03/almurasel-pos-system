import type { AuditLog } from '../types'
import { apiGet } from './client'

export function listAuditLogs() {
  return apiGet<AuditLog[]>('/audit-logs')
}
