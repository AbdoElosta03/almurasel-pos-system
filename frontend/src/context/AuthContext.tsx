import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import * as authApi from '../api/auth'
import { queryClient } from '../api/queryCache'
import type { Role, User } from '../types'
import { clearSession, getStoredRole, getToken, setSession } from '../utils/storage'

interface AuthContextValue {
  user: User | null
  role: Role | null
  loading: boolean
  login: (username: string, password: string) => Promise<Role>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      return
    }
    const me = await authApi.fetchMe()
    setUser(me)
  }, [])

  useEffect(() => {
    let active = true
    const bootstrap = async () => {
      if (!getToken()) {
        if (active) {
          setLoading(false)
        }
        return
      }
      try {
        await refresh()
      } catch {
        clearSession()
        queryClient.clear()
        if (active) {
          setUser(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }
    void bootstrap()
    return () => {
      active = false
    }
  }, [refresh])

  const login = useCallback(async (username: string, password: string) => {
    const token = await authApi.login({ username, password })
    queryClient.clear()
    setSession(token.access_token, token.role)
    await refresh()
    return token.role
  }, [refresh])

  const logout = useCallback(() => {
    clearSession()
    queryClient.clear()
    setUser(null)
  }, [])

  const role = user?.role ?? (getStoredRole() as Role | null)

  const value = useMemo(
    () => ({ user, role, loading, login, logout, refresh }),
    [user, role, loading, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
