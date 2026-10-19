import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import type { Role } from '../../types'
import { LoadingBlock } from '../ui/LoadingBlock'

export function RequireRole({ role }: { role: Role }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingBlock />
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin/reports' : '/cashier/pos'} replace />
  }
  return <Outlet />
}
