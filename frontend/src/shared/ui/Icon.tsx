import type { ReactNode, SVGProps } from 'react'

export type IconName = 'home' | 'pos' | 'shift' | 'users' | 'categories' | 'products' | 'reports' | 'audit' | 'settings' | 'sales' | 'logout' | 'arrow' | 'store' | 'card' | 'cash' | 'bag' | 'search' | 'grid' | 'list' | 'trash'

const paths: Record<IconName, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-7h6v7"/></>,
  pos: <><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8M12 17v4M7 8h4M7 12h8"/></>,
  shift: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  users: <><path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 4.2a4 4 0 0 1 0 7.6M22 20v-2a4 4 0 0 0-3-3.9"/><circle cx="9" cy="7" r="4"/></>,
  categories: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  products: <><path d="m3 7 9-4 9 4-9 4-9-4ZM3 7v10l9 4 9-4V7M12 11v10"/></>,
  reports: <><path d="M4 20V10M10 20V4M16 20v-7M22 20v-9M2 20h22"/></>,
  audit: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  settings: <><path d="M10.3 2.6h3.4l.6 2.2a8 8 0 0 1 1.8.8l2-.9 2.4 2.4-.9 2a8 8 0 0 1 .8 1.8l2.2.6v3.4l-2.2.6a8 8 0 0 1-.8 1.8l.9 2-2.4 2.4-2-.9a8 8 0 0 1-1.8.8l-.6 2.2h-3.4l-.6-2.2a8 8 0 0 1-1.8-.8l-2 .9-2.4-2.4.9-2a8 8 0 0 1-.8-1.8L1.4 14v-3.4l2.2-.6a8 8 0 0 1 .8-1.8l-.9-2 2.4-2.4 2 .9a8 8 0 0 1 1.8-.8l.6-2.2Z"/><circle cx="12" cy="12.3" r="3"/></>,
  sales: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6M9 12h6"/></>,
  logout: <><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 7l5 5-5 5M19 12H9"/></>,
  arrow: <><path d="M19 12H5m6-6-6 6 6 6"/></>,
  store: <><path d="M3 10h18l-2-6H5l-2 6ZM4 10v10h16V10M9 20v-7h6v7"/></>,
  card: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></>,
  cash: <><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M5 12h1m12 0h1"/></>,
  bag: <><path d="M4 8h16l-1 13H5L4 8ZM9 9V6a3 3 0 0 1 6 0v3"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  list: <><path d="M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1"/></>,
  trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6M10 10v7m4-7v7"/></>,
}

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>
}
