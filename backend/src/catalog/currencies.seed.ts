import { CurrencyKind } from '@prisma/client'

export interface CurrencySeed {
  code: string
  kind: CurrencyKind
  name: string
  symbol?: string
  decimals: number
  cryptoNetwork?: string
}

/**
 * Catálogo inicial de monedas. La PK natural es `code` (ISO 4217 para fiat,
 * ticker estándar para cripto). Se siembra en cada arranque con upsert idempotente.
 */
export const CURRENCY_SEED: CurrencySeed[] = [
  // Fiat principales del usuario
  { code: 'USD', kind: 'FIAT', name: 'Dólar estadounidense', symbol: '$', decimals: 2 },
  { code: 'VES', kind: 'FIAT', name: 'Bolívar venezolano', symbol: 'Bs.', decimals: 2 },
  { code: 'DOP', kind: 'FIAT', name: 'Peso dominicano', symbol: 'RD$', decimals: 2 },
  { code: 'COP', kind: 'FIAT', name: 'Peso colombiano', symbol: 'COL$', decimals: 2 },
  { code: 'EUR', kind: 'FIAT', name: 'Euro', symbol: '€', decimals: 2 },

  // Otras fiat de la región
  { code: 'BRL', kind: 'FIAT', name: 'Real brasileño', symbol: 'R$', decimals: 2 },
  { code: 'ARS', kind: 'FIAT', name: 'Peso argentino', symbol: '$', decimals: 2 },
  { code: 'CLP', kind: 'FIAT', name: 'Peso chileno', symbol: '$', decimals: 0 },
  { code: 'MXN', kind: 'FIAT', name: 'Peso mexicano', symbol: '$', decimals: 2 },
  { code: 'PEN', kind: 'FIAT', name: 'Sol peruano', symbol: 'S/', decimals: 2 },
  { code: 'GBP', kind: 'FIAT', name: 'Libra esterlina', symbol: '£', decimals: 2 },

  // Cripto principales
  { code: 'USDT', kind: 'CRYPTO', name: 'Tether USD', symbol: 'USDT', decimals: 6, cryptoNetwork: 'multi' },
  { code: 'USDC', kind: 'CRYPTO', name: 'USD Coin', symbol: 'USDC', decimals: 6, cryptoNetwork: 'multi' },
  { code: 'BTC', kind: 'CRYPTO', name: 'Bitcoin', symbol: '₿', decimals: 8, cryptoNetwork: 'bitcoin' },
  { code: 'ETH', kind: 'CRYPTO', name: 'Ethereum', symbol: 'Ξ', decimals: 18, cryptoNetwork: 'ethereum' },
  { code: 'SOL', kind: 'CRYPTO', name: 'Solana', symbol: 'SOL', decimals: 9, cryptoNetwork: 'solana' },

  // Wallet original a veces guarda VEF (legacy code) para bolívar — mantenemos ambos.
  { code: 'VEF', kind: 'FIAT', name: 'Bolívar (código legacy)', symbol: 'Bs.', decimals: 2 },
]
