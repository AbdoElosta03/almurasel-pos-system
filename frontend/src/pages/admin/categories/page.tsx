import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'

import { ApiError } from '../../../api/errors'
import * as categoriesApi from '../../../api/categories'
import type { Category } from '../../../types'
import type { PaginatedResult } from '../../../types/common'
import { Alert } from '../../../shared/ui/Alert'
import { LoadingBlock } from '../../../shared/ui/LoadingBlock'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { Toast, type ToastMessage } from '../../../shared/ui/Toast'
import { Button } from '../../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { CategoryCreateForm } from './components/CategoryCreateForm'
import { CategoryList } from './components/CategoryList'

const PAGE_SIZE = 10

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<PaginatedResult<Category> | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const load = useCallback(async (currentPage: number) => {
    const data = await categoriesApi.listCategoriesPage(currentPage, PAGE_SIZE)
    setCategories(data.items)
    setResult(data)
  }, [])

  const changePage = (nextPage: number) => {
    setError(null)
    setLoading(true)
    setPage(nextPage)
  }

  useEffect(() => {
    void load(page)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'تعذر تحميل التصنيفات'))
      .finally(() => setLoading(false))
  }, [load, page])

  if (loading) {
    return <LoadingBlock />
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 border-b border-border/40 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="التصنيفات" description="يمكن حذف تصنيف لم يُستخدم أي منتج منه في فاتورة." />
        <Button
          onClick={() => setIsCreateOpen(true)}
          size="lg"
          className="h-14 min-h-14 shrink-0 rounded-2xl px-6 text-lg font-bold shadow-lg shadow-primary/15"
        >
          <Plus className="size-5 shrink-0" />
          <span>إضافة تصنيف جديد</span>
        </Button>
      </div>

      {error ? <Alert className="mb-4">{error}</Alert> : null}

      <CategoryList
        categories={categories}
        startIndex={(page - 1) * PAGE_SIZE}
        page={page}
        pageSize={PAGE_SIZE}
        total={result?.total ?? 0}
        onPageChange={changePage}
        onToggle={async (category) => {
          await categoriesApi.updateCategory(category.id, { is_active: !category.is_active })
          await load(page)
        }}
        onDelete={async (category) => {
          try {
            await categoriesApi.deleteCategory(category.id)
            if (categories.length === 1 && page > 1) changePage(page - 1)
            else await load(page)
            setToast({ tone: 'success', text: `تم حذف التصنيف «${category.name}»` })
          } catch (err) {
            const text = err instanceof ApiError ? err.message : 'تعذر حذف التصنيف'
            setToast({ tone: 'error', text })
          }
        }}
      />

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة تصنيف جديد</DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <CategoryCreateForm
              onCreate={async (name) => {
                await categoriesApi.createCategory({ name })
                if (page === 1) await load(1)
                else changePage(1)
              }}
              onClose={() => setIsCreateOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}
