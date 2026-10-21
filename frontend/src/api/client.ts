import axios, { type AxiosRequestConfig } from 'axios'

import { API_BASE } from '../config'
import { translateError } from './errorMessages'
import { ApiError } from './errors'
import { getToken } from '../utils/storage'
import { invalidateAfterWrite, queryClient, staleTimeFor } from './queryCache'

export const http = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 0
      const code = typeof error.response?.data?.code === 'string' ? error.response.data.code : 'http_error'
      throw new ApiError(status, code, translateError(code))
    }
    throw error
  },
)

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  // Authentication is checked against the server each time; never reuse a previous identity.
  if (url === '/auth/me') {
    const { data } = await http.get<T>(url, config)
    return data
  }
  return queryClient.fetchQuery({
    queryKey: ['api', url, config?.params ?? null],
    staleTime: staleTimeFor(url),
    queryFn: async ({ signal }) => {
      const { data } = await http.get<T>(url, { ...config, signal })
      return data
    },
  })
}

export async function apiPost<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await http.post<T>(url, body, config)
  invalidateAfterWrite(url)
  return data
}

export async function apiPatch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await http.patch<T>(url, body, config)
  invalidateAfterWrite(url)
  return data
}

export async function apiDelete(url: string, config?: AxiosRequestConfig): Promise<void> {
  await http.delete(url, config)
  invalidateAfterWrite(url)
}
