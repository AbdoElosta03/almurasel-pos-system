import { Input } from '../../components/ui/input'
import { digitsOnly, PIN_MAX_LENGTH, PIN_MIN_LENGTH } from '../lib/pinPolicy'

export function NumericPinInput({
  id,
  value,
  onChange,
  disabled,
  placeholder = 'أرقام فقط (4–32)',
  autoComplete,
  className,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  autoComplete?: string
  className?: string
}) {
  return (
    <Input
      id={id}
      type="password"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete={autoComplete}
      placeholder={placeholder}
      minLength={PIN_MIN_LENGTH}
      maxLength={PIN_MAX_LENGTH}
      value={value}
      onChange={(event) => onChange(digitsOnly(event.target.value))}
      disabled={disabled}
      className={className}
    />
  )
}
