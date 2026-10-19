import type { SelectHTMLAttributes } from 'react'

import { NativeSelect } from '../../components/ui/native-select'

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <NativeSelect {...props} />
}
