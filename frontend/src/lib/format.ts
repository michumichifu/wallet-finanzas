/**
 * Formateo numérico y monetario.
 *
 * Convención: para mostrar dinero usamos `font-variant-numeric: tabular-nums`
 * (ya activo via `.tabular`). Así montos en columna quedan alineados al céntimo.
 */

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const compactUsdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const intFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

export function fmtUsd(value: number | null | undefined, opts?: { compact?: boolean }): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  if (opts?.compact) return compactUsdFormatter.format(value)
  return usdFormatter.format(value)
}

export function fmtNumber(value: number | string | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return '—'
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

export function fmtMoneyByCurrency(amount: string | number, currencyCode: string): string {
  const n = typeof amount === 'number' ? amount : Number(amount)
  if (!Number.isFinite(n)) return '—'
  // Para cripto con muchos decimales, usar más precisión cuando es subunidad.
  const decimals = ['BTC'].includes(currencyCode) ? 8 : ['ETH'].includes(currencyCode) ? 6 : ['USDT', 'USDC'].includes(currencyCode) ? 2 : 2
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
  return `${formatted} ${currencyCode}`
}

export function fmtCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return intFormatter.format(value)
}

export function fmtPercentDelta(current: number, previous: number): { text: string; sign: 1 | 0 | -1 } {
  if (!Number.isFinite(previous) || previous === 0) return { text: '—', sign: 0 }
  const ratio = (current - previous) / Math.abs(previous)
  const sign = ratio > 0 ? 1 : ratio < 0 ? -1 : 0
  const text = `${sign === 1 ? '+' : ''}${(ratio * 100).toFixed(1)}%`
  return { text, sign }
}
