import type { ButtonHTMLAttributes } from 'react'

import { Button as ShadcnButton } from '../../components/ui/button'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'md' | 'lg'

const variants = { primary: 'default', secondary: 'outline', danger: 'destructive', ghost: 'ghost' } as const

export function Button({ variant = 'primary', size = 'lg', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <ShadcnButton variant={variants[variant]} size={size === 'md' ? 'default' : 'lg'} {...props} />
}

