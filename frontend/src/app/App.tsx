import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'

import { queryClient } from '../api/queryCache'
import { AuthProvider } from '../context/AuthContext'
import { LicenseProvider, useLicense } from '../context/LicenseContext'
import { ActivatePage } from '../pages/activate/page'
import { AppRoutes } from './routes'

function LicensedApp() {
  const { status } = useLicense()
  if (status && status.enforced && !status.active) {
    return <ActivatePage />
  }
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LicenseProvider>
        <LicensedApp />
      </LicenseProvider>
    </QueryClientProvider>
  )
}
