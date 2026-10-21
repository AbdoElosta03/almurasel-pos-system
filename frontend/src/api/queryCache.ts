import { QueryClient } from '@tanstack/react-query'

// Keep this cache in memory only: financial data must not survive a page reload or account change.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: 5 * 60_000, refetchOnWindowFocus: false },
  },
})

export function staleTimeFor(url: string): number {
  if (url.startsWith('/products') || url.startsWith('/categories')) return 60_000
  if (url === '/shifts/current') return 5_000
  return 15_000
}

export function invalidateAfterWrite(url: string): void {
  // A mutation is only invalidated after it succeeds. Inactive pages fetch fresh data
  // on their next visit; no extra background requests are made for unmounted pages.
  let paths: string[]
  if (url.startsWith('/sales')) paths = ['/sales', '/reports']
  else if (url.startsWith('/shifts')) paths = ['/shifts', '/sales', '/reports']
  else if (url.startsWith('/products')) paths = ['/products']
  else if (url.startsWith('/categories')) paths = ['/categories', '/products']
  else if (url.startsWith('/purchases')) paths = ['/purchases']
  else if (url.startsWith('/users')) paths = ['/users']
  else if (url.startsWith('/backups')) paths = ['/backups']
  else paths = []

  if (!url.startsWith('/auth/login')) paths.push('/audit-logs')
  if (paths.length === 0) return

  void queryClient.invalidateQueries({
    predicate: (query) => {
      const [scope, path] = query.queryKey
      return scope === 'api' && typeof path === 'string' && paths.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
    },
    refetchType: 'none',
  })
}
