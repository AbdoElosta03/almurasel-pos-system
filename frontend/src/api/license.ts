import type { LicenseStatus } from '../types'
import { apiGet, apiPost } from './client'

export function fetchLicenseStatus() {
  return apiGet<LicenseStatus>('/license/status')
}

export function activateLicense(token: string) {
  return apiPost<LicenseStatus>('/license/activate', { token })
}
