import { Outlet } from 'react-router-dom'

import { AppShell } from './AppShell'
import { HomeScreen, type HomeItem } from './HomeScreen'

const cashierItems: HomeItem[] = [
  { to: '/cashier/pos', label: 'نقطة البيع', description: 'ابدأ طلبًا جديدًا وأتمّ الدفع', icon: 'pos', featured: true },
  { to: '/cashier/shift', label: 'الوردية', description: 'فتح الوردية ومتابعتها وإغلاقها', icon: 'shift' },
  { to: '/cashier/invoices', label: 'الفواتير', description: 'مراجعة فواتير المبيعات', icon: 'sales' },
  { to: '/cashier/settings', label: 'الإعدادات', description: 'إدارة إعدادات حسابك', icon: 'settings' },
]

export function CashierHome() {
  return <HomeScreen role="cashier" items={cashierItems} />
}

export function CashierLayout() {
  return (
    <AppShell title="شاشة الكاشير" home="/cashier">
      <Outlet />
    </AppShell>
  )
}
