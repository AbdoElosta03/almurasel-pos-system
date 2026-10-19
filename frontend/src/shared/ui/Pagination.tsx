import { Button } from '../../components/ui/button'

export function Pagination({ page, pageSize, total, onPageChange }: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <nav aria-label="صفحات النتائج" className="grid grid-cols-3 items-center gap-2 border-t border-border px-4 py-4 sm:px-6">
      <Button type="button" variant="outline" className="justify-self-start" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>السابق</Button>
      <span className="text-center text-sm text-muted-foreground">صفحة {page} من {pages}</span>
      <Button type="button" variant="outline" className="justify-self-end" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>التالي</Button>
    </nav>
  )
}
