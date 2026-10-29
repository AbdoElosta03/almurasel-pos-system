import { Navigate, Route, Routes } from 'react-router-dom'

import { RequireAuth } from '../shared/auth/RequireAuth'
import { RequireRole } from '../shared/auth/RequireRole'
import { AdminHome, AdminLayout } from '../shared/layout/AdminLayout'
import { CashierHome, CashierLayout } from '../shared/layout/CashierLayout'
import { CategoriesPage } from '../pages/admin/categories/page'
import { ProductsPage } from '../pages/admin/products/page'
import { PurchasesPage } from '../pages/admin/purchases/page'
import { PurchaseCreatePage } from '../pages/admin/purchases/create/page'
import { PurchaseDetailsPage } from '../pages/admin/purchases/details/page'
import { ReportsPage } from '../pages/admin/reports/page'
import { StatisticsPage } from '../pages/admin/statistics/page'
import { WeeklySalesPage } from '../pages/admin/statistics/weekly/page'
import { DailyProductSalesPage } from '../pages/admin/statistics/daily-products/page'
import { DailyClosingsPage } from '../pages/admin/daily-closings/page'
import { AdminSaleDetailsPage } from '../pages/admin/reports/details/page'
import { SettingsPage } from '../pages/admin/settings/page'
import { DatabasePage } from '../pages/admin/settings/database/page'
import { UsersPage } from '../pages/admin/users/page'
import { PosPage } from '../pages/cashier/pos/page'
import { ShiftPage } from '../pages/cashier/shift/page'
import { CashierInvoicesPage } from '../pages/cashier/invoices/page'
import { CashierInvoiceDetailsPage } from '../pages/cashier/invoices/details/page'
import { CashierSettingsPage } from '../pages/cashier/settings/page'
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
            <Route path="purchases/new" element={<PurchaseCreatePage />} />
            <Route path="purchases/:purchaseId" element={<PurchaseDetailsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="statistics" element={<StatisticsPage />} />
            <Route path="statistics/weekly" element={<WeeklySalesPage />} />
            <Route path="statistics/daily-products" element={<DailyProductSalesPage />} />
            <Route path="daily-closings" element={<DailyClosingsPage />} />
            <Route path="reports/sales/:saleId" element={<AdminSaleDetailsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="settings/database" element={<DatabasePage />} />
          </Route>
        </Route>
        <Route element={<RequireRole role="cashier" />}>
          <Route path="/cashier" element={<CashierLayout />}>
            <Route index element={<CashierHome />} />
            <Route path="shift" element={<ShiftPage />} />
            <Route path="pos" element={<PosPage />} />
            <Route path="invoices" element={<CashierInvoicesPage />} />
            <Route path="invoices/:saleId" element={<CashierInvoiceDetailsPage />} />
            <Route path="settings" element={<CashierSettingsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
