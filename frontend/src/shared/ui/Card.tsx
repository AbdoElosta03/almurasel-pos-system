import type { HTMLAttributes } from 'react'

import { Card as ShadcnCard } from '../../components/ui/card'
import { cn } from '../lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  // Existing cards are block containers; only pages that request flex should become flex.
  return <ShadcnCard className={cn('block flex-row p-5 sm:p-6', className)} {...props} />
}
