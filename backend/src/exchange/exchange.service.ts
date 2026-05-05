import { Injectable } from '@nestjs/common'
import { Prisma, RateSource } from '@prisma/client'
import { PrismaService } from '@/prisma/prisma.service'

/**
 * Conversión de montos entre monedas usando snapshots de tasa.
 *
 * Política para convertir CUALQUIER moneda a USD:
 *   1. Si la moneda es USD (o USDT/USDC en su tasa "stable" 1:1), retornar tal cual.
 *   2. Si tenemos un snapshot directo (currency → USD) cercano en tiempo, usarlo.
 *   3. Si tenemos un snapshot inverso (USD → currency) cercano en tiempo, invertir.
 *   4. Para VEF/VES: prioriza fuentes en este orden:
 *        BINANCE_P2P > INFERRED_FROM_TRANSFER > MANUAL > BCV (último recurso).
 *      Esto refleja la realidad del usuario: solo nos importa la tasa P2P real
 *      con la que pagó, no la tasa BCV estatal.
 *   5. Para fiat regional sin snapshot: tasa fija conservadora (DOP→USD = 60, etc.).
 */

const STABLE_USD_EQUIVALENT = new Set(['USD', 'USDT', 'USDC'])

const FALLBACK_RATES: Record<string, number> = {
  // X / 1 USD — usadas solo si no hay snapshot.
  DOP: 60,
  COP: 4000,
  EUR: 0.92,
  BRL: 5.0,
  ARS: 1000,
  CLP: 950,
  MXN: 17,
  PEN: 3.7,
  GBP: 0.78,
}

const VEF_PREFERENCE: RateSource[] = [
  RateSource.BINANCE_P2P,
  RateSource.INFERRED_FROM_TRANSFER,
  RateSource.MANUAL,
  RateSource.BCV,
]

@Injectable()
export class ExchangeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Convierte un monto a USD usando la tasa más apropiada al `at` provisto.
   * Devuelve null si no hay datos suficientes y no hay fallback aplicable.
   */
  async toUsd(amount: Prisma.Decimal | number, currency: string, at: Date): Promise<number | null> {
    const numeric = typeof amount === 'number' ? amount : Number(amount)
    if (!Number.isFinite(numeric)) return null
    if (STABLE_USD_EQUIVALENT.has(currency)) return numeric

    // VEF/VES: priorizar P2P real.
    if (currency === 'VEF' || currency === 'VES') {
      const rate = await this.findVefRate(at)
      if (rate !== null) return numeric / rate
      // No fallback para bolívares: si no hay tasa, retornar null para no mentir.
      return null
    }

    // Otra moneda: snapshot directo o inverso.
    const direct = await this.findClosestRate(currency, 'USD', at)
    if (direct !== null) return numeric * direct
    const inverse = await this.findClosestRate('USD', currency, at)
    if (inverse !== null) return numeric / inverse

    // Fallback fijo.
    const fb = FALLBACK_RATES[currency]
    if (fb !== undefined) return numeric / fb

    return null
  }

  /** Mejor tasa VEF→USD según preferencia de fuente y cercanía temporal. */
  private async findVefRate(at: Date): Promise<number | null> {
    for (const source of VEF_PREFERENCE) {
      // VEF/VES → cuántos VEF por 1 USD = `rate` con fromCode=USD, toCode=VEF
      // Pero también el formato natural fromCode=VEF, toCode=USD (rate = 1/X).
      // Buscamos ambos sentidos.
      const rate = await this.prisma.exchangeRate.findFirst({
        where: {
          source,
          OR: [
            { fromCode: 'USD', toCode: { in: ['VEF', 'VES'] } },
            { fromCode: { in: ['VEF', 'VES'] }, toCode: 'USD' },
          ],
        },
        orderBy: [{ observedAt: 'desc' }],
      })
      if (!rate) continue

      // El campo rate del schema: cuántas unidades de TO equivalen a 1 unidad de FROM.
      if (rate.fromCode === 'USD') return Number(rate.rate)
      // fromCode = VEF/VES, toCode = USD → 1 VEF = rate USD → 1 USD = 1/rate VEF.
      return 1 / Number(rate.rate)
    }
    return null
  }

  /**
   * Tasa más cercana en tiempo entre dos monedas, priorizando snapshots
   * anteriores al `at`. Si no hay anteriores, toma el primero posterior.
   */
  private async findClosestRate(fromCode: string, toCode: string, at: Date): Promise<number | null> {
    const before = await this.prisma.exchangeRate.findFirst({
      where: { fromCode, toCode, observedAt: { lte: at } },
      orderBy: { observedAt: 'desc' },
    })
    if (before) return Number(before.rate)
    const after = await this.prisma.exchangeRate.findFirst({
      where: { fromCode, toCode, observedAt: { gt: at } },
      orderBy: { observedAt: 'asc' },
    })
    return after ? Number(after.rate) : null
  }
}
