export const TABLE_VISIBLE_ROW_COUNT = 5

export function shouldScrollTable(itemCount: number): boolean {
  return itemCount > TABLE_VISIBLE_ROW_COUNT
}

export function tableScrollContainerClass(itemCount: number): string {
  return shouldScrollTable(itemCount)
    ? 'max-h-[calc(3.5rem+5*5rem)] overflow-auto overscroll-contain'
    : 'overflow-x-auto overscroll-contain'
}

export function tableHeadCellStickyClass(itemCount: number): string {
  return shouldScrollTable(itemCount) ? 'sticky top-0 z-10 bg-secondary' : ''
}

export function tableHeaderRowClass(itemCount: number, compact = false): string {
  if (shouldScrollTable(itemCount)) return 'bg-secondary'
  return compact ? 'bg-secondary/60' : 'bg-secondary/50'
}
