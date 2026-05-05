import { parse } from 'csv-parse/sync'
import { readFileSync } from 'node:fs'

/**
 * Parser puro del CSV de Wallet by BudgetBakers.
 *
 * Características del formato:
 *   - Separador: `;`
 *   - Encoding: UTF-8
 *   - Primera fila: cabecera
 *   - Campo `transfer`: "true" / "false"
 *   - Campo `type`: "Gastos" / "Ingresos" (en español)
 *   - Campo `amount`: número con punto decimal, negativo para gastos
 *   - Campo `ref_currency_amount`: monto en la moneda de referencia del usuario.
 *     OJO: para amounts en VEF este campo está bugueado por usar tasa BCV;
 *     debe tratarse como informativo, no autoritativo.
 *   - Campo `date`: "YYYY-MM-DD HH:mm:ss"
 *   - Campo `envelope_id`: id interno de Wallet para la subcategoría
 *
 * El parser no toca DB. Solo retorna filas tipadas listas para que
 * `WalletCsvImportService` las procese.
 */

export interface WalletCsvRow {
  account: string
  category: string
  currency: string
  amount: number
  refCurrencyAmount: number
  type: 'Gastos' | 'Ingresos' | string
  paymentType: string
  paymentTypeLocal: string
  note: string
  date: Date
  gpsLat: number | null
  gpsLng: number | null
  gpsAccuracy: number | null
  warrantyMonths: number
  isTransfer: boolean
  payee: string
  labels: string
  envelopeId: string
  customCategory: boolean
  /** Índice 1-based en el CSV, útil para reportes de error. */
  sourceRow: number
}

export interface ParseWalletCsvResult {
  rows: WalletCsvRow[]
  totalLines: number
}

const REQUIRED_COLUMNS = [
  'account',
  'category',
  'currency',
  'amount',
  'ref_currency_amount',
  'type',
  'date',
  'transfer',
  'envelope_id',
]

function toNumber(raw: string | undefined): number {
  if (!raw || raw.trim() === '') return 0
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

function toNumberOrNull(raw: string | undefined): number | null {
  if (!raw || raw.trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function toBool(raw: string | undefined): boolean {
  return (raw ?? '').trim().toLowerCase() === 'true'
}

function toDate(raw: string): Date {
  // "YYYY-MM-DD HH:mm:ss" — interpretamos como hora local del usuario al importar.
  // (El timezone real se aplicará cuando el record se asocie a su tenant.)
  const iso = raw.trim().replace(' ', 'T')
  const d = new Date(iso)
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date in CSV row: ${raw}`)
  }
  return d
}

export function parseWalletCsv(input: string | Buffer): ParseWalletCsvResult {
  const raw = typeof input === 'string' ? input : input.toString('utf8')
  const records: Record<string, string>[] = parse(raw, {
    delimiter: ';',
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    bom: true,
    trim: false,
  }) as Record<string, string>[]

  if (records.length === 0) {
    throw new Error('CSV de Wallet vacío o sin filas de datos')
  }

  const firstRowKeys = Object.keys(records[0])
  for (const col of REQUIRED_COLUMNS) {
    if (!firstRowKeys.includes(col)) {
      throw new Error(`CSV de Wallet inválido: falta columna "${col}". Columnas vistas: ${firstRowKeys.join(', ')}`)
    }
  }

  const rows: WalletCsvRow[] = records.map((r, idx) => ({
    account: (r.account ?? '').trim(),
    category: (r.category ?? '').trim(),
    currency: (r.currency ?? '').trim(),
    amount: toNumber(r.amount),
    refCurrencyAmount: toNumber(r.ref_currency_amount),
    type: (r.type ?? '').trim(),
    paymentType: (r.payment_type ?? '').trim(),
    paymentTypeLocal: (r.payment_type_local ?? '').trim(),
    note: r.note ?? '',
    date: toDate(r.date ?? ''),
    gpsLat: toNumberOrNull(r.gps_latitude),
    gpsLng: toNumberOrNull(r.gps_longitude),
    gpsAccuracy: toNumberOrNull(r.gps_accuracy_in_meters),
    warrantyMonths: toNumber(r.warranty_in_month),
    isTransfer: toBool(r.transfer),
    payee: (r.payee ?? '').trim(),
    labels: (r.labels ?? '').trim(),
    envelopeId: (r.envelope_id ?? '').trim(),
    customCategory: toBool(r.custom_category),
    sourceRow: idx + 2, // +1 por header, +1 por base 1
  }))

  return { rows, totalLines: rows.length }
}

export function readWalletCsvFile(path: string): ParseWalletCsvResult {
  const buf = readFileSync(path)
  return parseWalletCsv(buf)
}
