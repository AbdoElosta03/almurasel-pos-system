const DIRHAMS_PER_LYD = 1000

/** يحوّل قيمة API (رقم أو نص من Decimal) إلى دينار. */
export function toLydNumber(amount: unknown): number {
  const value = typeof amount === 'number' ? amount : Number(amount)
  if (!Number.isFinite(value)) {
    return 0
  }
  return value
}

export function formatLyd(amount: unknown): string {
  return `${toLydNumber(amount).toFixed(3)} د.ل`
}

/** يحوّل نصاً مثل 1 أو 1.5 إلى دينار (رقم). */
export function parseLydInput(value: string): number {
  const normalized = value.trim().replace(',', '.')
  if (!normalized) {
    return 0
  }
  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('مبلغ غير صالح')
  }
  return Math.round(amount * DIRHAMS_PER_LYD) / DIRHAMS_PER_LYD
}

export function lineTotalLyd(unitPriceLyd: unknown, qty: number): number {
  const unit = toLydNumber(unitPriceLyd)
  return Math.round(unit * qty * DIRHAMS_PER_LYD) / DIRHAMS_PER_LYD
}
