import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

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
  const [expanded, setExpanded] = useState(false)
  const visibleCategories = expanded ? categories : categories.slice(0, 4)

  return (
    <div className={`flex min-w-0 flex-wrap gap-2 ${expanded ? 'lg:max-h-48 lg:overflow-y-auto lg:overscroll-contain lg:pl-1' : ''}`} aria-label="تصفية المنتجات حسب التصنيف">
      <Button
        type="button"
        variant={selectedId === null ? 'default' : 'outline'}
        onClick={() => onSelect(null)}
        className="max-w-full whitespace-normal px-4"
      >
        كل التصنيفات
      </Button>
      {visibleCategories.map((category) => (
        <Button
          key={category.id}
          type="button"
          variant={selectedId === category.id ? 'default' : 'outline'}
          onClick={() => onSelect(category.id)}
          className="max-w-full whitespace-normal px-4"
        >
          {category.name}
        </Button>
      ))}
      {categories.length > 4 ? (
        <Button
          type="button"
          variant="ghost"
          aria-expanded={expanded}
          onClick={() => {
            if (expanded && selectedId !== null && !categories.slice(0, 4).some((category) => category.id === selectedId)) {
              onSelect(null)
            }
            setExpanded(!expanded)
          }}
          className="max-w-full px-4"
        >
          {expanded ? <><ChevronUp className="size-4" /> عرض أقل</> : <><ChevronDown className="size-4" /> عرض المزيد ({categories.length - 4})</>}
        </Button>
      ) : null}
    </div>
  )
}
