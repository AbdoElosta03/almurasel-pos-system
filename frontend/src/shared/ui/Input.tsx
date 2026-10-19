import type { InputHTMLAttributes } from 'react'

import { Input as ShadcnInput } from '../../components/ui/input'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <ShadcnInput {...props} />
}
