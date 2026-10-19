import type { Category } from '../../../../types'
import { Button } from '../../../../components/ui/button'

export function CategoryFilter({
  categories,
  selectedId,
  onSelect,
}: {
  categories: Category[]
  selectedId: number | null
  onSelect: (id: number | null) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto overscroll-contain pb-2" aria-label="تصفية المنتجات حسب التصنيف">
      <Button
        type="button"
        variant={selectedId === null ? 'default' : 'outline'}
        onClick={() => onSelect(null)}
        className="shrink-0 px-5"
      >
        كل التصنيفات
      </Button>
      {categories.map((category) => (
        <Button
          key={category.id}
          type="button"
          variant={selectedId === category.id ? 'default' : 'outline'}
          onClick={() => onSelect(category.id)}
          className="shrink-0 px-5"
        >
          {category.name}
        </Button>
      ))}
    </div>
  )
}
