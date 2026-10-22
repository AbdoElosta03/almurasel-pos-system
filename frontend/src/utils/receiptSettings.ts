const PRINT_RECEIPT_KEY = 'almurasel.print_receipt'

export function isReceiptPrintingEnabled(): boolean {
  const stored = localStorage.getItem(PRINT_RECEIPT_KEY)
  if (stored === null) return true
  return stored === '1'
}

export function setReceiptPrintingEnabled(enabled: boolean): void {
  localStorage.setItem(PRINT_RECEIPT_KEY, enabled ? '1' : '0')
}
