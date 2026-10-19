import { Outlet } from 'react-router-dom'

import { AppShell } from './AppShell'
import { HomeScreen, type HomeItem } from './HomeScreen'

const adminItems: HomeItem[] = [
  { to: '/admin/reports', label: 'التقارير', description: 'راقب الأداء والمبيعات', icon: 'reports', featured: true },
  { to: '/admin/products', label: 'المنتجات', description: 'إدارة القائمة والأسعار', icon: 'products' },
  { to: '/admin/categories', label: 'التصنيفات', description: 'تنظيم أقسام المنتجات', icon: 'categories' },
  { to: '/admin/users', label: 'المستخدمون', description: 'الحسابات والصلاحيات', icon: 'users' },
  { to: '/admin/purchases', label: 'مشتريات', description: 'متابعة مشتريات المحل', icon: 'bag' },
  { to: '/admin/settings', label: 'الإعدادات', description: 'تخصيص إعدادات النظام', icon: 'settings' },
]

export function AdminHome() {
  return <HomeScreen role="admin" items={adminItems} />
}

export function AdminLayout() {
  return (
    <AppShell title="لوحة الإدارة" home="/admin">
      <Outlet />
    </AppShell>
  )
}
