import type { ChangePasswordRequest, LoginRequest, RecoverAdminRequest, TokenResponse, User } from '../types'
import { apiGet, apiPatch, apiPost } from './client'

export function login(body: LoginRequest) {
  return apiPost<TokenResponse>('/auth/login', body)
}

export function fetchMe() {
  return apiGet<User>('/auth/me')
}

export function changePassword(body: ChangePasswordRequest) {
  return apiPatch<void>('/auth/password', body)
}

export function recoverAdmin(body: RecoverAdminRequest) {
  return apiPost<void>('/auth/recover-admin', body)
}
