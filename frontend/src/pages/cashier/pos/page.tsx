import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ApiError } from '../../../api/errors'
import * as categoriesApi from '../../../api/categories'
import * as productsApi from '../../../api/products'
import * as salesApi from '../../../api/sales'
import * as shiftsApi from '../../../api/shifts'
import type { Category, PaymentMethod, Product, Sale } from '../../../types'
import { formatLyd, lineTotalLyd } from '../../../utils/money'
import { Alert } from '../../../shared/ui/Alert'
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog'
import { LoadingBlock } from '../../../shared/ui/LoadingBlock'
import { PageHeader } from '../../../shared/ui/PageHeader'
import { Icon } from '../../../shared/ui/Icon'
import { Toast, type ToastMessage } from '../../../shared/ui/Toast'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { CartPanel, type CartLine } from './components/CartPanel'
import { CategoryFilter } from './components/CategoryFilter'
import { CheckoutBar } from './components/CheckoutBar'
import { ProductGrid } from './components/ProductGrid'

export function PosPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [hasShift, setHasShift] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [lines, setLines] = useState<CartLine[]>([])
  const [lastSale, setLastSale] = useState<Sale | null>(null)
  const [payMethod, setPayMethod] = useState<PaymentMethod | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const closeToast = useCallback(() => setToast(null), [])

  const load = useCallback(async () => {
    try {
      await shiftsApi.currentShift()
      setHasShift(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setHasShift(false)
      } else {
        throw err
      }
    }
    const [cats, prods] = await Promise.all([categoriesApi.listCategories(), productsApi.listProducts()])
    setCategories(cats)
    setProducts(prods)
  }, [])

  useEffect(() => {
    void load()
      .catch((err) => setError(err instanceof ApiError ? err.message : 'تعذر تحميل نقطة البيع'))
      .finally(() => setLoading(false))
  }, [load])

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return products.filter((product) =>
      (selectedCategoryId === null || product.category_id === selectedCategoryId) &&
      (!query || product.name.toLocaleLowerCase().includes(query)),
    )
  }, [products, selectedCategoryId, search])

  const totalLyd = useMemo(
    () => lines.reduce((sum, line) => sum + lineTotalLyd(line.product.price_lyd, line.qty), 0),
    [lines],
  )

  const addProduct = (product: Product) => {
    setLines((current) => {
      const existing = current.find((line) => line.product.id === product.id)
      if (existing) {
        return current.map((line) =>
          line.product.id === product.id ? { ...line, qty: line.qty + 1 } : line,
        )
      }
      return [...current, { product, qty: 1 }]
    })
  }

  const changeQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      setLines((current) => current.filter((line) => line.product.id !== productId))
      return
    }
    setLines((current) =>
      current.map((line) => (line.product.id === productId ? { ...line, qty } : line)),
    )
  }

  const checkout = async (payment_method: PaymentMethod) => {
    setBusy(true)
    setToast(null)
    try {
      const sale = await salesApi.createSale({
        payment_method,
        items: lines.map((line) => ({ product_id: line.product.id, qty: line.qty })),
      })
      setLastSale(sale)
      setLines([])
      setPayMethod(null)
      setToast({ tone: 'success', text: `تم إنشاء فاتورة #${sale.id}` })
    } catch (err) {
      setToast({ tone: 'error', text: err instanceof ApiError ? err.message : 'تعذر إتمام البيع' })
    } finally {
      setBusy(false)
    }
  }

  const cancelLast = async () => {
    if (!lastSale) {
      return
    }
    setBusy(true)
    setToast(null)
    try {
      const cancelled = await salesApi.cancelSale(lastSale.id)
      setLastSale(cancelled)
      setConfirmCancel(false)
      setToast({ tone: 'success', text: `تم إلغاء فاتورة #${cancelled.id}` })
    } catch (err) {
      setToast({ tone: 'error', text: err instanceof ApiError ? err.message : 'تعذر الإلغاء' })
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <LoadingBlock />
  }

  if (!hasShift) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="نقطة البيع" description="يجب فتح وردية قبل البيع." />
        <Alert tone="info">لا توجد وردية مفتوحة.</Alert>
        <Button asChild size="lg" className="mt-5">
          <Link to="/cashier/shift">
            <Icon name="shift" className="size-5" /> فتح الوردية
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-1 flex-col gap-3 lg:min-h-0">
      <div className="flex items-center justify-between gap-3">
        <h1 className="border-r-4 border-highlight pr-3 text-xl font-extrabold text-foreground sm:text-2xl">نقطة البيع</h1>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <span className="size-2 rounded-full bg-emerald-500" /> وردية مفتوحة
        </span>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,28%)]">
        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block w-full shrink-0 sm:w-56 xl:w-64">
              <span className="sr-only">البحث عن منتج</span>
              <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث سريع عن منتج..." className="pl-11" />
              <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-primary" />
            </label>
            <div className="min-w-0 flex-1">
              <CategoryFilter categories={categories} selectedId={selectedCategoryId} onSelect={setSelectedCategoryId} />
            </div>
            <div className="hidden shrink-0 gap-1 rounded-xl border border-border bg-card p-1 xl:flex" aria-label="طريقة عرض المنتجات">
              {(['grid', 'list'] as const).map((mode) => (
                <Button
                  key={mode}
                  size="icon"
                  variant={view === mode ? 'default' : 'ghost'}
                  aria-label={mode === 'grid' ? 'عرض شبكي' : 'عرض قائمة'}
                  aria-pressed={view === mode}
                  onClick={() => setView(mode)}
                  className="rounded-lg"
                >
                  <Icon name={mode} className="size-5" />
                </Button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pl-2">
            <ProductGrid products={visibleProducts} onAdd={addProduct} view={view} />
          </div>
        </div>
        <div className="flex min-h-0 flex-col gap-3 lg:h-full">
          <CartPanel lines={lines} totalLyd={totalLyd} onChangeQty={changeQty} onClear={() => setLines([])} />
          <CheckoutBar disabled={lines.length === 0} busy={busy} onPay={setPayMethod} />
          {lastSale && lastSale.status === 'completed' ? (
            <Button
              type="button"
              variant="ghost"
              className="min-h-12 shrink-0 text-red-700 hover:bg-red-50 hover:text-red-800"
              onClick={() => setConfirmCancel(true)}
              disabled={busy}
            >
              إلغاء آخر فاتورة (#{lastSale.id})
            </Button>
          ) : null}
        </div>
      </div>
      <ConfirmDialog
        open={payMethod !== null}
        title="تأكيد الدفع"
        description={payMethod ? `${payMethod === 'cash' ? 'دفع نقدي' : 'دفع بطاقة'} — الإجمالي ${formatLyd(totalLyd)}` : ''}
        confirmLabel={payMethod === 'card' ? 'تأكيد دفع البطاقة' : 'تأكيد الدفع النقدي'}
        busy={busy}
        onConfirm={() => {
          if (payMethod) void checkout(payMethod)
        }}
        onClose={() => setPayMethod(null)}
      />
      <ConfirmDialog
        open={confirmCancel}
        title="إلغاء آخر فاتورة"
        description={lastSale ? `سيتم إلغاء فاتورة #${lastSale.id}. هذا الإجراء لا يمكن التراجع عنه.` : ''}
        confirmLabel="تأكيد الإلغاء"
        confirmVariant="destructive"
        busy={busy}
        onConfirm={() => void cancelLast()}
        onClose={() => setConfirmCancel(false)}
      />
      <Toast message={toast} onClose={closeToast} compact />
    </div>
  )
}
