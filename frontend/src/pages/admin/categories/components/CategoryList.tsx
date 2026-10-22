import { useState } from 'react'
import { Folder, Layers3, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'

import type { Category } from '../../../../types'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Card } from '../../../../components/ui/card'
import { ConfirmDialog } from '../../../../shared/ui/ConfirmDialog'
import { Pagination } from '../../../../shared/ui/Pagination'
import { tableHeadCellStickyClass, tableHeaderRowClass, tableScrollContainerClass } from '../../../../shared/lib/tableScroll'

export function CategoryList({
  categories,
  startIndex = 0,
  page,
  pageSize,
  total,
  onPageChange,
  onToggle,
  onDelete,
}: {
  categories: Category[]
  startIndex?: number
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onToggle: (category: Category) => Promise<void>
  onDelete: (category: Category) => Promise<void>
}) {
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)

  if (categories.length === 0) {
    return (
      <Card className="rounded-[2rem] border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
        <div className="flex flex-col items-center justify-center space-y-4">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Layers3 className="size-8" />
          </span>
          <div>
            <p className="text-xl font-extrabold text-foreground">لا توجد تصنيفات مسجلة</p>
            <p className="mt-1 text-sm">اضغط على زر إضافة تصنيف جديد بالأعلى لبدء القائمة.</p>
          </div>
        </div>
      </Card>
    )
  }

  const handleToggle = async (category: Category) => {
    setTogglingId(category.id)
    try {
      await onToggle(category)
    } finally {
      setTogglingId(null)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await onDelete(pendingDelete)
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const isActionBusy = togglingId !== null || deleting
  const itemCount = categories.length

  return (
    <Card className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_12px_40px_-24px_rgba(18,83,78,0.12)]">
      <div className={tableScrollContainerClass(itemCount)}>
        <table className="w-full border-collapse text-right select-none">
          <thead>
            <tr className={`h-14 border-b border-border text-base font-bold text-muted-foreground ${tableHeaderRowClass(itemCount)}`}>
              {['#', 'التصنيف', 'الحالة', 'الإجراءات'].map((label) => (
                <th
                  key={label}
                  className={`px-6 py-3 font-extrabold text-foreground ${label === 'الإجراءات' ? 'text-center' : ''} ${tableHeadCellStickyClass(itemCount)}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-lg">
            {categories.map((category, index) => {
              const isToggling = togglingId === category.id

              return (
                <tr key={category.id} className="h-20 transition-colors hover:bg-secondary/10">
                  <td className="w-12 px-6 py-4 text-sm font-semibold text-muted-foreground">
                     {startIndex + index + 1}
                  </td>
                  <td className="min-w-56 px-6 py-4 font-extrabold text-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary">
                        <Folder className="size-5" />
                      </span>
                      <span className="line-clamp-1">{category.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={category.is_active ? 'default' : 'destructive'} className="gap-1.5 px-3 py-1 text-sm">
                      <span className={`size-2 rounded-full ${category.is_active ? 'bg-emerald-300' : 'bg-red-300'}`} />
                      {category.is_active ? 'نشط' : 'معطّل'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        variant={category.is_active ? 'outline' : 'secondary'}
                        size="sm"
                        onClick={() => void handleToggle(category)}
                        disabled={isActionBusy}
                        loading={isToggling}
                        className="h-11 min-h-11 rounded-xl border-border/80 px-4 text-base font-bold text-foreground"
                      >
                        {!isToggling && (
                          category.is_active ? (
                            <>
                              <ToggleRight className="size-5 shrink-0 text-emerald-600" />
                              <span>تعطيل</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="size-5 shrink-0 text-muted-foreground" />
                              <span>تفعيل</span>
                            </>
                          )
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setPendingDelete(category)}
                        disabled={isActionBusy}
                        className="size-11 min-h-11 shrink-0 rounded-xl border border-red-100 bg-red-50 p-0 text-red-600 hover:bg-red-600 hover:text-white"
                        title="حذف التصنيف"
                        aria-label={`حذف التصنيف ${category.name}`}
                      >
                        <Trash2 className="size-5 shrink-0" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="حذف التصنيف"
        description={pendingDelete ? `هل تريد حذف التصنيف «${pendingDelete.name}»؟ لا يمكن التراجع عن هذا الإجراء.` : ''}
        confirmLabel="تأكيد الحذف"
        confirmVariant="destructive"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => setPendingDelete(null)}
      />
    </Card>
  )
}
