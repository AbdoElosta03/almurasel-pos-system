import type { ComponentProps } from 'react'

import { Label as ShadcnLabel } from '../../components/ui/label'

export function Label(props: ComponentProps<typeof ShadcnLabel>) {
  return <ShadcnLabel {...props} />
}
