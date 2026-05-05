import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { ExchangeService } from '@/exchange/exchange.service'

export interface AccountListItem {
  id: string
  name: string
  type: string
  currencyCode: string
  color: string | null
  iconKey: string | null
  excludeFromTotals: boolean
  isArchived: boolean
  position: number
  /** Saldo en la moneda nativa de la cuenta. */
  balance: string
  /** Saldo equivalente en USD usando tasa P2P real. Null si no se pudo convertir. */
  balanceUsd: number | null
}

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService, private readonly exchange: ExchangeService) {}

  async listForTenant(tenantId: string, { includeArchived = false } = {}): Promise<AccountListItem[]> {
    const accounts = await this.prisma.account.findMany({
      where: { tenantId, ...(includeArchived ? {} : { isArchived: false }) },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    })

    // Una sola query agrupada para sumar amounts.
    const balances = await this.prisma.record.groupBy({
      by: ['accountId'],
      where: { tenantId },
      _sum: { amount: true },
    })
    const byAccount = new Map<string, Prisma.Decimal>()
    for (const b of balances) {
      byAccount.set(b.accountId, b._sum.amount ?? new Prisma.Decimal(0))
    }

    const now = new Date()
    return Promise.all(
      accounts.map(async (a) => {
        const native = (byAccount.get(a.id) ?? new Prisma.Decimal(0)).plus(a.initialBalance)
        const balanceUsd = await this.exchange.toUsd(native, a.currencyCode, now)
        return {
          id: a.id,
          name: a.name,
          type: a.type,
          currencyCode: a.currencyCode,
          color: a.color,
          iconKey: a.iconKey,
          excludeFromTotals: a.excludeFromTotals,
          isArchived: a.isArchived,
          position: a.position,
          balance: native.toFixed(8).replace(/\.?0+$/, ''),
          balanceUsd: balanceUsd === null ? null : Number(balanceUsd.toFixed(2)),
        }
      }),
    )
  }
}
