import { Outlet } from 'react-router-dom'

import { AppShell } from './AppShell'
import { HomeScreen, type HomeItem } from './HomeScreen'

const adminItems: HomeItem[] = [
  { to: '/admin/reports', label: 'مبيعات', description: 'متابعة مبيعات المحل', icon: 'sales', featured: true },
  { to: '/admin/daily-closings', label: 'إغلاق الحسابات اليومية', description: 'مطابقة درج كل وردية', icon: 'closing' },
  { to: '/admin/purchases', label: 'مشتريات', description: 'متابعة مشتريات المحل', icon: 'bag' },
  { to: '/admin/categories', label: 'التصنيفات', description: 'تنظيم أقسام المنتجات', icon: 'categories' },
  { to: '/admin/products', label: 'المنتجات', description: 'إدارة القائمة والأسعار', icon: 'products' },
  { to: '/admin/users', label: 'المستخدمون', description: 'الحسابات والصلاحيات', icon: 'users' },
  { to: '/admin/settings', label: 'الإعدادات', description: 'تخصيص إعدادات النظام', icon: 'settings', centerOnHome: true },
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
