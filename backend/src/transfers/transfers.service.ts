import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { ExchangeService } from '@/exchange/exchange.service'

export interface TransferPairView {
  id: string
  occurredAt: string
  appliedRate: string | null
  rateSource: string | null
  notes: string | null
  from: TransferLeg
  to: TransferLeg
}

export interface TransferLeg {
  recordId: string
  account: { id: string; name: string; currencyCode: string }
  amount: string
  amountUsd: number | null
  note: string | null
}

@Injectable()
export class TransfersService {
  constructor(private readonly prisma: PrismaService, private readonly exchange: ExchangeService) {}

  async list(tenantId: string, params: {
    from?: Date
    to?: Date
    page?: number
    pageSize?: number
  }): Promise<{
    items: TransferPairView[]
    total: number
    page: number
    pageSize: number
  }> {
    const page = Math.max(1, params.page ?? 1)
    const pageSize = Math.min(200, Math.max(1, params.pageSize ?? 50))

    const where = {
      tenantId,
      ...(params.from || params.to
        ? { occurredAt: { ...(params.from ? { gte: params.from } : {}), ...(params.to ? { lte: params.to } : {}) } }
        : {}),
    }

    const [total, pairs] = await this.prisma.$transaction([
      this.prisma.transferPair.count({ where }),
      this.prisma.transferPair.findMany({
        where,
        include: {
          records: {
            include: {
              account: { select: { id: true, name: true, currencyCode: true } },
            },
            orderBy: { amount: 'asc' },
          },
        },
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    const items: TransferPairView[] = []
    for (const pair of pairs) {
      const debit = pair.records.find((r) => Number(r.amount) < 0)
      const credit = pair.records.find((r) => Number(r.amount) > 0)
      if (!debit || !credit) continue

      const [debitUsd, creditUsd] = await Promise.all([
        this.exchange.toUsd(debit.amount, debit.currencyCode, debit.occurredAt),
        this.exchange.toUsd(credit.amount, credit.currencyCode, credit.occurredAt),
      ])
      items.push({
        id: pair.id,
        occurredAt: pair.occurredAt.toISOString(),
        appliedRate: pair.appliedRate ? pair.appliedRate.toString() : null,
        rateSource: pair.rateSource,
        notes: pair.notes,
        from: {
          recordId: debit.id,
          account: debit.account,
          amount: debit.amount.toFixed(8).replace(/\.?0+$/, ''),
          amountUsd: debitUsd === null ? null : Number(debitUsd.toFixed(2)),
          note: debit.note,
        },
        to: {
          recordId: credit.id,
          account: credit.account,
          amount: credit.amount.toFixed(8).replace(/\.?0+$/, ''),
          amountUsd: creditUsd === null ? null : Number(creditUsd.toFixed(2)),
          note: credit.note,
        },
      })
    }

    return { items, total, page, pageSize }
  }
}
