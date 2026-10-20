import type { Product } from '../../../../types'
import { formatLyd } from '../../../../utils/money'
import { Icon } from '../../../../shared/ui/Icon'
import { Button } from '../../../../components/ui/button'

// Catalog products currently have no image field. Only show a local image for
// recognizable items; other products receive a neutral visual placeholder.
function productImage(name: string) {
  const value = name.toLocaleLowerCase()
  if (/عصير|برتقال|juice|orange/.test(value)) return '/product-images/juice.jpg'
  if (/كرواسون|croissant/.test(value)) return '/product-images/croissant.jpg'
  if (/كيك|كاتو|cake/.test(value)) return '/product-images/cake.jpg'
  if (/مثلجة|باردة|آيس|ايس|iced|ice|cold/.test(value) && /قهوة|لاتيه|coffee|latte/.test(value)) return '/product-images/latte.jpg'
  if (/قهوة|كابتشينو|كابوتشينو|لاتيه|اسبرسو|إسبريسو|coffee|latte|cappuccino|espresso/.test(value)) return '/product-images/coffee.jpg'
  if (/مخبوز|فطيرة|pastry|muffin/.test(value)) return '/product-images/pastry.jpg'
  return null
}

export function ProductGrid({ products, onAdd, view }: { products: Product[]; onAdd: (product: Product) => void; view: 'grid' | 'list' }) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
        لا توجد منتجات مطابقة. جرّب البحث باسم آخر أو تغيير التصنيف.
      </div>
    )
  }

  return (
    <div className={view === 'grid' ? 'grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5' : 'grid gap-3 sm:grid-cols-2'}>
      {products.map((product) => {
        const image = productImage(product.name)
        return (
          <Button
            key={product.id}
            type="button"
            variant="outline"
            onClick={() => onAdd(product)}
            aria-label={`إضافة ${product.name} إلى السلة`}
            className={`h-auto w-full justify-start overflow-hidden whitespace-normal rounded-2xl border-border bg-card text-right shadow-[0_8px_24px_-18px_rgba(18,83,78,.35)] hover:bg-card active:border-primary ${view === 'grid' ? 'flex-col items-stretch p-3' : 'min-h-24 flex-row items-center gap-4 p-3'}`}
          >
            <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background text-primary ${view === 'list' ? 'size-20' : 'h-32 w-full sm:h-36'}`}>
              {image ? <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Icon name="products" className="size-10 opacity-50" />}
            </span>
            <span className={view === 'list' ? 'flex min-w-0 flex-1 flex-col' : 'flex w-full flex-1 flex-col pt-2'}>
              <span className="line-clamp-2 text-base font-bold leading-snug text-foreground">{product.name}</span>
              <span className="mt-1 font-extrabold text-primary">{formatLyd(product.price_lyd)}</span>
            </span>
          </Button>
        )
      })}
    </div>
  )
}
