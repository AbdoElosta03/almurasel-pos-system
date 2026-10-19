import type { Shift, ShiftClose, ShiftOpen } from '../types'
import { apiGet, apiPost } from './client'

export function openShift(body: ShiftOpen) {
  return apiPost<Shift>('/shifts/open', body)
}

export function currentShift() {
  return apiGet<Shift>('/shifts/current')
}

export function closeShift(shiftId: number, body: ShiftClose) {
  return apiPost<Shift>(`/shifts/${shiftId}/close`, body)
}
