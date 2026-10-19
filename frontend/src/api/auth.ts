import type { LoginRequest, TokenResponse, User } from '../types'
import { apiGet, apiPost } from './client'

export function login(body: LoginRequest) {
  return apiPost<TokenResponse>('/auth/login', body)
}

export function fetchMe() {
  return apiGet<User>('/auth/me')
}
