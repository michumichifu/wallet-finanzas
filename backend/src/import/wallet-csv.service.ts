import { Injectable, Logger } from '@nestjs/common'
import { ImportSource, ImportStatus, PaymentType, RateSource, RecordType } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { CatalogService } from '@/catalog/catalog.service'
import { parseWalletCsv, type WalletCsvRow } from './wallet-csv.parser'

interface ImportError {
  sourceRow: number
  message: string
}

interface ImportReport {
  source: 'WALLET_BUDGETBAKERS_CSV'
  totalRows: number
  imported: number
  skipped: number
  errors: ImportError[]
  inferredRates: number
  accountsCreated: string[]
}

const PAYMENT_TYPE_MAP: Record<string, PaymentType> = {
  CASH: 'CASH',
  DEBIT_CARD: 'DEBIT_CARD',
  CREDIT_CARD: 'CREDIT_CARD',
  TRANSFER: 'TRANSFER',
  VOUCHER: 'VOUCHER',
  MOBILE_PAYMENT: 'MOBILE_PAYMENT',
  WEB_PAYMENT: 'WEB_PAYMENT',
}

@Injectable()
export class WalletCsvImportService {
  private readonly logger = new Logger(WalletCsvImportService.name)

  constructor(private readonly prisma: PrismaService, private readonly catalog: CatalogService) {}

  /**
   * Importa un CSV exportado por Wallet by BudgetBakers a un tenant dado.
   * El método es **transaccional a nivel de batch**: si falla la operación
   * principal, se actualiza ImportBatch con status FAILED. Las filas con error
   * individual se skipean y reportan, sin abortar el batch.
   */
  async import(params: {
    tenantId: string
    csvContent: string | Buffer
    fileName?: string
  }): Promise<{ batchId: string; report: ImportReport }> {
    const { tenantId, csvContent, fileName } = params

    // Parse del CSV.
    const { rows } = parseWalletCsv(csvContent)
    this.logger.log(`Parsed ${rows.length} rows from ${fileName ?? '<buffer>'}`)

    // Crea ImportBatch en estado PROCESSING.
    const batch = await this.prisma.importBatch.create({
      data: {
        tenantId,
        source: ImportSource.WALLET_BUDGETBAKERS_CSV,
        status: ImportStatus.PROCESSING,
        fileName,
        totalRows: rows.length,
        startedAt: new Date(),
      },
    })

    const errors: ImportError[] = []
    let imported = 0
    let skipped = 0

    try {
      // Pre-stage 1: asegurar catálogo de monedas.
      await this.catalog.seedCurrencies()

      // Pre-stage 2: asegurar categorías Wallet en el tenant.
      await this.catalog.seedWalletCategoriesForTenant(tenantId)

      // Pre-stage 3: cuentas. Detectamos cuentas únicas en el CSV y las creamos
      // si no existen. La moneda de la cuenta = la primera vista en el CSV
      // para ese nombre de cuenta.
      const accountsCreated = await this.ensureAccounts(tenantId, rows)

      // Pre-stage 4: tasas P2P inferidas de las transferencias USD↔VEF (y otras).
      const inferredRates = await this.inferAndStoreRates(rows)

      // Cache de IDs locales del tenant para no consultar en cada row.
      const accountByName = new Map<string, { id: string; currencyCode: string }>()
      for (const a of await this.prisma.account.findMany({ where: { tenantId } })) {
        accountByName.set(a.name, { id: a.id, currencyCode: a.currencyCode })
      }
      const categoryByEnvelope = new Map<string, string>()
      for (const c of await this.prisma.category.findMany({
        where: { tenantId, walletEnvelopeId: { not: null } },
      })) {
        if (c.walletEnvelopeId) categoryByEnvelope.set(c.walletEnvelopeId, c.id)
      }

      // Stage principal: agrupar transferencias y crear records.
      // Una transferencia es un par de filas (debit + credit) con el mismo timestamp.
      // Las identificamos por (occurredAt, isTransfer=true).
      const transferGroups = new Map<string, WalletCsvRow[]>()
      const nonTransferRows: WalletCsvRow[] = []
      for (const r of rows) {
        if (r.isTransfer) {
          const key = r.date.toISOString()
          const list = transferGroups.get(key) ?? []
          list.push(r)
          transferGroups.set(key, list)
        } else {
          nonTransferRows.push(r)
        }
      }

      // Procesa transferencias en pares.
      for (const [key, group] of transferGroups) {
        if (group.length === 0) continue
        if (group.length === 1) {
          // Transferencia huérfana: la guardamos como record normal con flag.
          const single = group[0]!
          try {
            await this.persistRecord({
              tenantId,
              row: single,
              accountByName,
              categoryByEnvelope,
              batchId: batch.id,
            })
            imported++
          } catch (e) {
            errors.push({ sourceRow: single.sourceRow, message: (e as Error).message })
            skipped++
          }
          continue
        }
        // Pares (incluso múltiples agrupados al mismo segundo).
        // Buscamos un debit (amount<0) y un credit (amount>0).
        const debit = group.find((g) => g.amount < 0)
        const credit = group.find((g) => g.amount > 0)
        if (!debit || !credit) {
          // No es un par válido — los procesamos como records sueltos.
          for (const r of group) {
            try {
              await this.persistRecord({
                tenantId,
                row: r,
                accountByName,
                categoryByEnvelope,
                batchId: batch.id,
              })
              imported++
            } catch (e) {
              errors.push({ sourceRow: r.sourceRow, message: (e as Error).message })
              skipped++
            }
          }
          continue
        }
        try {
          const result = await this.persistTransferPair({
            tenantId,
            debit,
            credit,
            accountByName,
            categoryByEnvelope,
            batchId: batch.id,
          })
          imported += result.created
        } catch (e) {
          errors.push({ sourceRow: debit.sourceRow, message: `transfer ${key}: ${(e as Error).message}` })
          skipped += group.length
        }
      }

      // Procesa records normales.
      for (const r of nonTransferRows) {
        try {
          await this.persistRecord({
            tenantId,
            row: r,
            accountByName,
            categoryByEnvelope,
            batchId: batch.id,
          })
          imported++
        } catch (e) {
          errors.push({ sourceRow: r.sourceRow, message: (e as Error).message })
          skipped++
        }
      }

      const report: ImportReport = {
        source: 'WALLET_BUDGETBAKERS_CSV',
        totalRows: rows.length,
        imported,
        skipped,
        errors,
        inferredRates,
        accountsCreated,
      }

      await this.prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          status: errors.length === 0 ? ImportStatus.SUCCEEDED : ImportStatus.PARTIAL,
          importedRows: imported,
          skippedRows: skipped,
          errorRows: errors.length,
          report: report as unknown as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      })

      return { batchId: batch.id, report }
    } catch (fatal) {
      await this.prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          status: ImportStatus.FAILED,
          report: {
            error: (fatal as Error).message,
            partialErrors: errors,
          } as unknown as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      })
      throw fatal
    }
  }

  /** Crea las cuentas únicas vistas en el CSV. Idempotente. */
  private async ensureAccounts(tenantId: string, rows: WalletCsvRow[]): Promise<string[]> {
    // Para cada nombre de cuenta detectamos su moneda dominante.
    const seen = new Map<string, string>() // name → currencyCode
    for (const r of rows) {
      if (!r.account) continue
      if (!seen.has(r.account)) seen.set(r.account, r.currency || 'USD')
    }

    const existing = new Set(
      (await this.prisma.account.findMany({ where: { tenantId }, select: { name: true } })).map((a) => a.name),
    )

    const created: string[] = []
    for (const [name, currencyCode] of seen) {
      if (existing.has(name)) continue
      // Asegura que la moneda existe (fallback a USD si la moneda del CSV no
      // está en el catálogo — caso raro de monedas legacy).
      const cur = await this.prisma.currency.findUnique({ where: { code: currencyCode } })
      const finalCurrency = cur ? currencyCode : 'USD'
      await this.prisma.account.create({
        data: {
          tenantId,
          name,
          currencyCode: finalCurrency,
          type: this.guessAccountType(name, finalCurrency),
        },
      })
      created.push(name)
    }
    return created
  }

  private guessAccountType(name: string, currencyCode: string): 'GENERAL' | 'CASH' | 'SAVINGS' | 'CRYPTO' | 'INVESTMENT' {
    const lower = name.toLowerCase()
    if (currencyCode === 'USDT' || currencyCode === 'USDC' || currencyCode === 'BTC' || currencyCode === 'ETH' || currencyCode === 'SOL') return 'CRYPTO'
    if (lower.startsWith('efectivo') || lower === 'cash') return 'CASH'
    if (lower.includes('binance') || lower.includes('usdt')) return 'CRYPTO'
    if (lower.includes('ahorro') || lower.includes('savings')) return 'SAVINGS'
    if (lower.includes('acciones') || lower.includes('etf') || lower.includes('investment')) return 'INVESTMENT'
    return 'GENERAL'
  }

  /**
   * Recorre las transferencias y, cuando son entre cuentas de monedas distintas,
   * deriva una tasa P2P (la usada de hecho por el usuario al hacer la conversión).
   * Las almacena en `ExchangeRate` con source INFERRED_FROM_TRANSFER.
   */
  private async inferAndStoreRates(rows: WalletCsvRow[]): Promise<number> {
    const transferRows = rows.filter((r) => r.isTransfer)
    const grouped = new Map<string, WalletCsvRow[]>()
    for (const r of transferRows) {
      const key = r.date.toISOString()
      const list = grouped.get(key) ?? []
      list.push(r)
      grouped.set(key, list)
    }

    let stored = 0
    for (const group of grouped.values()) {
      const debit = group.find((g) => g.amount < 0)
      const credit = group.find((g) => g.amount > 0)
      if (!debit || !credit) continue
      if (debit.currency === credit.currency) continue // misma moneda, no hay tasa.

      // Tasa: cuántas unidades de credit.currency equivalen a 1 unidad de debit.currency.
      const rate = credit.amount / Math.abs(debit.amount)
      if (!Number.isFinite(rate) || rate <= 0) continue

      // Idempotente: ya existente para ese par, fuente y observedAt → upsert no soportado por
      // combinación; usamos findFirst + create.
      const existing = await this.prisma.exchangeRate.findFirst({
        where: {
          fromCode: debit.currency,
          toCode: credit.currency,
          source: RateSource.INFERRED_FROM_TRANSFER,
          observedAt: debit.date,
        },
      })
      if (existing) continue

      // Aseguramos que ambas monedas existen (puede haber casos como VEF legacy).
      const [fromOk, toOk] = await Promise.all([
        this.prisma.currency.findUnique({ where: { code: debit.currency } }),
        this.prisma.currency.findUnique({ where: { code: credit.currency } }),
      ])
      if (!fromOk || !toOk) continue

      await this.prisma.exchangeRate.create({
        data: {
          fromCode: debit.currency,
          toCode: credit.currency,
          rate: new Prisma.Decimal(rate.toFixed(12)),
          source: RateSource.INFERRED_FROM_TRANSFER,
          observedAt: debit.date,
          sourceMeta: {
            note: 'Inferida de transferencia importada del CSV de Wallet',
          },
        },
      })
      stored++
    }
    return stored
  }

  /** Persiste un record simple (no transferencia). */
  private async persistRecord(args: {
    tenantId: string
    row: WalletCsvRow
    accountByName: Map<string, { id: string; currencyCode: string }>
    categoryByEnvelope: Map<string, string>
    batchId: string
  }): Promise<void> {
    const { tenantId, row, accountByName, categoryByEnvelope, batchId } = args
    const account = accountByName.get(row.account)
    if (!account) {
      throw new Error(`Account "${row.account}" no resolvió`)
    }
    const categoryId = row.envelopeId ? categoryByEnvelope.get(row.envelopeId) ?? null : null
    const recordType: RecordType = row.type === 'Ingresos' ? RecordType.INCOME : RecordType.EXPENSE

    await this.prisma.record.create({
      data: {
        tenantId,
        accountId: account.id,
        categoryId,
        type: recordType,
        amount: new Prisma.Decimal(row.amount),
        currencyCode: row.currency,
        refAmount: row.refCurrencyAmount !== 0 ? new Prisma.Decimal(row.refCurrencyAmount) : null,
        refCurrencyCode: row.refCurrencyAmount !== 0 ? 'DOP' : null,
        paymentType: PAYMENT_TYPE_MAP[row.paymentType] ?? PaymentType.CASH,
        paymentTypeLabel: row.paymentTypeLocal || null,
        payee: row.payee || null,
        note: row.note || null,
        occurredAt: row.date,
        gpsLat: row.gpsLat,
        gpsLng: row.gpsLng,
        gpsAccuracy: row.gpsAccuracy,
        warrantyMonths: row.warrantyMonths || null,
        isTransfer: false,
        importBatchId: batchId,
      },
    })
  }

  /**
   * Persiste los dos lados de una transferencia + el TransferPair.
   * Si hay diferencia de moneda, registra la appliedRate como P2P real.
   */
  private async persistTransferPair(args: {
    tenantId: string
    debit: WalletCsvRow
    credit: WalletCsvRow
    accountByName: Map<string, { id: string; currencyCode: string }>
    categoryByEnvelope: Map<string, string>
    batchId: string
  }): Promise<{ created: number }> {
    const { tenantId, debit, credit, accountByName, categoryByEnvelope, batchId } = args
    const debitAccount = accountByName.get(debit.account)
    const creditAccount = accountByName.get(credit.account)
    if (!debitAccount || !creditAccount) throw new Error('Cuenta de transferencia no resolvió')

    const transferCategoryId = categoryByEnvelope.get('20001') ?? null
    let appliedRate: Prisma.Decimal | null = null
    let rateSource: RateSource = RateSource.MANUAL
    if (debit.currency !== credit.currency) {
      const rate = credit.amount / Math.abs(debit.amount)
      if (Number.isFinite(rate) && rate > 0) {
        appliedRate = new Prisma.Decimal(rate.toFixed(12))
        rateSource = RateSource.INFERRED_FROM_TRANSFER
      }
    } else {
      appliedRate = new Prisma.Decimal(1)
    }

    const pair = await this.prisma.transferPair.create({
      data: {
        tenantId,
        appliedRate,
        rateSource,
        occurredAt: debit.date,
      },
    })

    await this.prisma.record.createMany({
      data: [
        {
          tenantId,
          accountId: debitAccount.id,
          categoryId: transferCategoryId,
          type: RecordType.TRANSFER,
          amount: new Prisma.Decimal(debit.amount),
          currencyCode: debit.currency,
          paymentType: PaymentType.CASH,
          paymentTypeLabel: debit.paymentTypeLocal || null,
          note: debit.note || null,
          occurredAt: debit.date,
          isTransfer: true,
          transferPairId: pair.id,
          importBatchId: batchId,
        },
        {
          tenantId,
          accountId: creditAccount.id,
          categoryId: transferCategoryId,
          type: RecordType.TRANSFER,
          amount: new Prisma.Decimal(credit.amount),
          currencyCode: credit.currency,
          paymentType: PaymentType.CASH,
          paymentTypeLabel: credit.paymentTypeLocal || null,
          note: credit.note || null,
          occurredAt: credit.date,
          isTransfer: true,
          transferPairId: pair.id,
          importBatchId: batchId,
        },
      ],
    })
    return { created: 2 }
  }
}
