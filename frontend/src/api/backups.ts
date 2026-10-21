import { apiGet, apiPost, http } from './client'

export type Backup = {
  filename: string
  kind: 'manual' | 'auto' | 'safety'
  created_at: string
  size_bytes: number
}

export function listBackups() {
  return apiGet<Backup[]>('/backups')
}

export function createBackup() {
  return apiPost<Backup>('/backups')
}

export async function downloadBackup(filename: string) {
  const { data } = await http.get<Blob>(`/backups/${encodeURIComponent(filename)}/download`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function restoreSavedBackup(filename: string, password: string) {
  return apiPost(`/backups/${encodeURIComponent(filename)}/restore`, { password })
}

export async function restoreUploadedBackup(file: File, password: string) {
  await http.post('/backups/restore-upload', file, {
    headers: { 'Content-Type': 'application/octet-stream', 'X-Restore-Password': password },
  })
}

export function resetDatabase(password: string, confirmation: string) {
  return apiPost('/backups/reset', { password, confirmation })
}
