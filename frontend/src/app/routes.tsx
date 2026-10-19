import { Navigate, Route, Routes } from 'react-router-dom'

import { RequireAuth } from '../shared/auth/RequireAuth'
import { RequireRole } from '../shared/auth/RequireRole'
import { AdminHome, AdminLayout } from '../shared/layout/AdminLayout'
import { CashierHome, CashierLayout } from '../shared/layout/CashierLayout'
import { CategoriesPage } from '../pages/admin/categories/page'
import { ProductsPage } from '../pages/admin/products/page'
import { PurchasesPage } from '../pages/admin/purchases/page'
import { ReportsPage } from '../pages/admin/reports/page'
import { SettingsPage } from '../pages/admin/settings/page'
import { UsersPage } from '../pages/admin/users/page'
import { PosPage } from '../pages/cashier/pos/page'
import { ShiftPage } from '../pages/cashier/shift/page'
import { LoginPage } from '../pages/login/page'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route element={<RequireRole role="admin" />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminHome />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route element={<RequireRole role="cashier" />}>
          <Route path="/cashier" element={<CashierLayout />}>
            <Route index element={<CashierHome />} />
            <Route path="shift" element={<ShiftPage />} />
            <Route path="pos" element={<PosPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
