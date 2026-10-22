import type { DailyClosing, DailyClosingList } from '../types'
import { apiGet, apiPost } from './client'

export function listDailyClosings(date: string) {
  return apiGet<DailyClosingList>('/daily-closings', { params: { date } })
}

export function closeDailyAccount(shiftId: number, countedCashLyd: number) {
  return apiPost<DailyClosing>(`/daily-closings/${shiftId}`, { counted_cash_lyd: countedCashLyd })
}
