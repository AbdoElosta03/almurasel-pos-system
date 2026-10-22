export const PIN_MIN_LENGTH = 4
export const PIN_MAX_LENGTH = 32

export function digitsOnly(value: string, maxLength = PIN_MAX_LENGTH): string {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

export function isValidPin(value: string): boolean {
  return /^\d+$/.test(value) && value.length >= PIN_MIN_LENGTH && value.length <= PIN_MAX_LENGTH
}
