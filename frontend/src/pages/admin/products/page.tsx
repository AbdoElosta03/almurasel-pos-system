import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'

import { ApiError } from '../../../api/errors'
import * as categoriesApi from '../../../api/categories'
import * as productsApi from '../../../api/products'
import type { Category, Product } from '../../../types'
import type { PaginatedResult } from '../../../types/common'
import { Alert } from '../../../shared/ui/Alert'
import { LoadingBlock } from '../../../shared/ui/LoadingBlock'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { Toast, type ToastMessage } from '../../../shared/ui/Toast'
import { Button } from '../../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { ProductCreateForm } from './components/ProductCreateForm'
import { ProductList } from './components/ProductList'

const PAGE_SIZE = 10

export function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<PaginatedResult<Product> | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const load = useCallback(async (currentPage: number) => {
    const [cats, prods] = await Promise.all([categoriesApi.listCategories(), productsApi.listProductsPage(currentPage, PAGE_SIZE)])
    setCategories(cats)
    setProducts(prods.items)
    setResult(prods)
  }, [])

  const changePage = (nextPage: number) => {
    setError(null)
    setLoading(true)
    setPage(nextPage)
  }

  useEffect(() => {
    void load(page)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'تعذر تحميل المنتجات'))
      .finally(() => setLoading(false))
  }, [load, page])

  if (loading) {
    return <LoadingBlock />
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header section with Action Button side-by-side */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4">
        <PageHeader title="المنتجات" description="يمكن حذف منتج لم يظهر في أي فاتورة. الأسعار بالدينار الليبي." />
        <Button
          onClick={() => setIsCreateOpen(true)}
          size="lg"
          className="h-14 min-h-14 rounded-2xl gap-2 font-bold text-lg shadow-lg shadow-primary/15 shrink-0 px-6"
        >
          <Plus className="size-5 shrink-0" />
          <span>إضافة منتج جديد</span>
        </Button>
      </div>

      {error ? <Alert className="mb-4">{error}</Alert> : null}

      {/* Main Product Table Component */}
      <ProductList
        products={products}
        categories={categories}
        startIndex={(page - 1) * PAGE_SIZE}
        page={page}
        pageSize={PAGE_SIZE}
        total={result?.total ?? 0}
        onPageChange={changePage}
        onToggle={async (product) => {
          await productsApi.updateProduct(product.id, { is_active: !product.is_active })
          await load(page)
        }}
        onImage={async (product, image) => {
          try {
            await productsApi.uploadProductImage(product.id, image)
            await load(page)
            setToast({ tone: 'success', text: `تم حفظ صورة المنتج «${product.name}»` })
          } catch (err) {
            const text = err instanceof ApiError ? err.message : 'تعذر حفظ صورة المنتج'
            setToast({ tone: 'error', text })
          }
        }}
        onRemoveImage={async (product) => {
          try {
            await productsApi.removeProductImage(product.id)
            await load(page)
            setToast({ tone: 'success', text: `تمت إزالة صورة «${product.name}» واستخدام الصورة الافتراضية` })
          } catch (err) {
            const text = err instanceof ApiError ? err.message : 'تعذر إزالة صورة المنتج'
            setToast({ tone: 'error', text })
          }
        }}
        onDelete={async (product) => {
          try {
            await productsApi.deleteProduct(product.id)
            if (products.length === 1 && page > 1) changePage(page - 1)
            else await load(page)
            setToast({ tone: 'success', text: `تم حذف المنتج «${product.name}»` })
          } catch (err) {
            const text = err instanceof ApiError ? err.message : 'تعذر حذف المنتج'
            setToast({ tone: 'error', text })
          }
        }}
      />

      {/* Touch-optimized Create Product Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة منتج جديد</DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <ProductCreateForm
              categories={categories.filter((c) => c.is_active)}
              onCreate={async (body, image) => {
                const product = await productsApi.createProduct(body)
                if (image) {
                  try {
                    await productsApi.uploadProductImage(product.id, image)
                  } catch (err) {
                    const text = err instanceof ApiError ? err.message : 'تعذر حفظ صورة المنتج'
                    setToast({ tone: 'error', text: `تم إنشاء المنتج، لكن ${text}` })
                  }
                }
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
