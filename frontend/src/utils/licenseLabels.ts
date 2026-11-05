import type { LicensePlan } from '../types'

export const LICENSE_PLAN_LABEL: Record<LicensePlan, string> = {
  two_days: 'يومان',
  week: 'أسبوعي',
  month: 'شهري',
  lifetime: 'غير محدود',
  development: 'تطوير (بلا قفل)',
}

export function formatLicenseExpiry(value: string | null | undefined): string {
  if (!value) return 'بدون انتهاء'
  return new Date(`${value}T12:00:00`).toLocaleDateString('ar-LY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
