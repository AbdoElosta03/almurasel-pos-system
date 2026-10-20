import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock3, LockKeyhole, ShoppingCart, WifiOff } from 'lucide-react'

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
import { Card } from '../../../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { CartPanel, type CartLine } from './components/CartPanel'
import { CategoryFilter } from './components/CategoryFilter'
import { CheckoutBar } from './components/CheckoutBar'
import { ProductGrid } from './components/ProductGrid'

export function PosPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [hasShift, setHasShift] = useState<boolean | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [lines, setLines] = useState<CartLine[]>([])
  const [lastSale, setLastSale] = useState<Sale | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const checkoutInProgress = useRef(false)
  const closeToast = useCallback(() => setToast(null), [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await shiftsApi.currentShift()
      setHasShift(true)
      const [cats, prods] = await Promise.all([categoriesApi.listCategories(), productsApi.listProducts()])
      setCategories(cats)
      setProducts(prods)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404 && err.code === 'no_open_shift') {
        setHasShift(false)
        return
      }
      setHasShift(null)
      setError(err instanceof ApiError && err.status !== 0 ? err.message : 'تعذر الاتصال بالخادم. تحقق من الشبكة ثم أعد المحاولة.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
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
    if (checkoutInProgress.current) return
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
    if (checkoutInProgress.current) return
    if (qty <= 0) {
      setLines((current) => current.filter((line) => line.product.id !== productId))
      return
    }
    setLines((current) =>
      current.map((line) => (line.product.id === productId ? { ...line, qty } : line)),
    )
  }

  const checkout = async (payment_method: PaymentMethod) => {
    if (checkoutInProgress.current || lines.length === 0) return
    checkoutInProgress.current = true
    setBusy(true)
    setToast({ tone: 'loading', text: 'جاري حفظ الفاتورة...' })
    setCheckoutError(null)
    try {
      const sale = await salesApi.createSale({
        payment_method,
        items: lines.map((line) => ({ product_id: line.product.id, qty: line.qty })),
      })
      setLastSale(sale)
      setLines([])
      setCartOpen(false)
      setToast({ tone: 'success', text: 'تم إنشاء الفاتورة بنجاح' })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'تعذر إتمام البيع'
      setCheckoutError(message)
      setToast({ tone: 'error', text: message })
    } finally {
      checkoutInProgress.current = false
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

  if (hasShift === null) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center">
        <Card className="w-full items-center gap-4 p-8 text-center">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary"><WifiOff className="size-8" aria-hidden="true" /></span>
          <h2 className="text-xl font-extrabold">تعذر تحميل نقطة البيع</h2>
          <p className="text-muted-foreground">{error ?? 'تعذر التحقق من حالة الوردية. تحقق من الاتصال ثم حاول مجدداً.'}</p>
          <Button size="lg" onClick={() => void load()}>إعادة المحاولة</Button>
        </Card>
      </div>
    )
  }

  if (!hasShift) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col pb-24 lg:justify-center lg:pb-0">
        <div className="mb-5 border-b border-border/60 pb-3">
          <PageHeader title="نقطة البيع" description="ابدأ ورديتك لتتمكن من تسجيل الطلبات وإتمام الدفع." />
        </div>
        {error ? <Alert className="mb-4">{error}</Alert> : null}
        <Card className="overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-border bg-secondary/50 px-5 py-4 sm:px-7">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShoppingCart className="size-5" aria-hidden="true" />
            </span>
            <span className="font-bold">منطقة البيع</span>
            <span className="mr-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm font-bold text-muted-foreground">
              <span className="size-2 rounded-full bg-muted-foreground" /> غير متاحة
            </span>
          </div>
          <div className="flex flex-col items-center px-5 py-8 text-center sm:px-8 sm:py-10">
            <span className="flex size-20 items-center justify-center rounded-3xl bg-secondary text-primary sm:size-24">
              <LockKeyhole className="size-10 sm:size-12" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-2xl font-extrabold text-foreground">لا توجد وردية مفتوحة</h3>
            <p className="mt-2 max-w-md text-base leading-relaxed text-muted-foreground">
              افتح وردية وأدخل نقدية الفتح أولاً، ثم يمكنك العودة إلى نقطة البيع وإنشاء الفواتير.
            </p>
            <Button asChild size="lg" className="mt-7 w-full rounded-2xl sm:w-auto sm:min-w-56">
              <Link to="/cashier/shift">
                <Clock3 className="size-5" aria-hidden="true" /> الانتقال لفتح الوردية <ArrowLeft className="size-5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const requestClear = () => {
    if (!checkoutInProgress.current && lines.length > 0) setConfirmClear(true)
  }

  return (
    <div className="flex w-full flex-1 flex-col gap-3 pb-24 lg:min-h-0 lg:pb-0">
      {error ? <Alert>{error}</Alert> : null}
      <div className="grid min-h-0 min-w-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,28%)]">
        <div className="flex min-h-0 min-w-0 flex-col gap-3">
          <div className="w-full">
            <label className="relative block w-full">
              <span className="sr-only">البحث عن منتج</span>
              <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث سريع عن منتج..." className="pl-11" />
              <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-primary" />
            </label>
          </div>
          <div className="flex min-w-0 items-start gap-2">
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
        <div className="hidden min-h-0 flex-col gap-3 lg:flex lg:h-full">
          <CartPanel lines={lines} totalLyd={totalLyd} onChangeQty={changeQty} onClear={requestClear} />
          <CheckoutBar disabled={lines.length === 0} busy={busy} onPay={(method) => void checkout(method)} />
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
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
        <Button type="button" size="lg" onClick={() => setCartOpen(true)} className="flex w-full justify-between rounded-2xl">
          <span className="flex items-center gap-2"><ShoppingCart className="size-5" /> السلة ({lines.reduce((sum, line) => sum + line.qty, 0)})</span>
          <span>{formatLyd(totalLyd)}</span>
        </Button>
      </div>
      <Dialog open={cartOpen} onOpenChange={(open) => { if (!busy) setCartOpen(open) }}>
        <DialogContent className="flex h-[min(80dvh,42rem)] flex-col gap-3 overflow-hidden p-4 sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>السلة</DialogTitle></DialogHeader>
          <CartPanel lines={lines} totalLyd={totalLyd} onChangeQty={changeQty} onClear={requestClear} />
          {checkoutError ? <Alert>{checkoutError}</Alert> : null}
          <CheckoutBar disabled={lines.length === 0} busy={busy} onPay={(method) => void checkout(method)} />
          {lastSale && lastSale.status === 'completed' ? (
            <Button variant="ghost" className="shrink-0 text-red-700" disabled={busy} onClick={() => { setCartOpen(false); setConfirmCancel(true) }}>
              إلغاء آخر فاتورة (#{lastSale.id})
            </Button>
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmClear}
        title="مسح السلة"
        description="سيتم حذف جميع الأصناف من الطلب الحالي. هل تريد المتابعة؟"
        confirmLabel="نعم، امسح السلة"
        confirmVariant="destructive"
        onConfirm={() => { setLines([]); setCheckoutError(null); setConfirmClear(false) }}
        onClose={() => setConfirmClear(false)}
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
      <Toast message={toast} onClose={closeToast} centered />
    </div>
  )
}
