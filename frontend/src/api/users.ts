import type { User, UserCreate, UserUpdate } from '../types'
import { apiDelete, apiGet, apiPatch, apiPost } from './client'

export function listUsers() {
  return apiGet<User[]>('/users')
}

export function createUser(body: UserCreate) {
  return apiPost<User>('/users', body)
}

export function updateUser(userId: number, body: UserUpdate) {
  return apiPatch<User>(`/users/${userId}`, body)
}

export function deleteUser(userId: number) {
  return apiDelete(`/users/${userId}`)
}
