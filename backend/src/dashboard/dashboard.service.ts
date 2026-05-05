import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { ExchangeService } from '@/exchange/exchange.service'

export interface DashboardSummary {
  from: string
  to: string
  totals: {
    incomeUsd: number
    expenseUsd: number
    netUsd: number
    transactionCount: number
  }
  /** Comparación con el periodo inmediato anterior de igual duración. */
  previousPeriod: {
    incomeUsd: number
    expenseUsd: number
    netUsd: number
  }
}

export interface CategoryBreakdownItem {
  categoryId: string | null
  slug: string | null
  name: string
  parentSlug: string | null
  totalUsd: number
  transactionCount: number
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService, private readonly exchange: ExchangeService) {}

  async summary(tenantId: string, from: Date, to: Date): Promise<DashboardSummary> {
    const [current, prev] = await Promise.all([
      this.aggregateRange(tenantId, from, to),
      this.aggregateRange(tenantId, this.previousFrom(from, to), from),
    ])
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      totals: current,
      previousPeriod: {
        incomeUsd: prev.incomeUsd,
        expenseUsd: prev.expenseUsd,
        netUsd: prev.netUsd,
      },
    }
  }

  async categoryBreakdown(
    tenantId: string,
    from: Date,
    to: Date,
    type: 'EXPENSE' | 'INCOME' = 'EXPENSE',
  ): Promise<CategoryBreakdownItem[]> {
    const records = await this.prisma.record.findMany({
      where: {
        tenantId,
        type,
        isTransfer: false,
        occurredAt: { gte: from, lte: to },
      },
      include: {
        category: {
          include: {
            parent: { select: { slug: true, name: true } },
          },
        },
      },
    })

    const buckets = new Map<string, CategoryBreakdownItem>()
    for (const r of records) {
      const usd = await this.exchange.toUsd(r.amount, r.currencyCode, r.occurredAt)
      if (usd === null) continue
      const absUsd = Math.abs(usd)
      const key = r.category?.id ?? 'sin-categoria'
      const existing = buckets.get(key)
      if (existing) {
        existing.totalUsd += absUsd
        existing.transactionCount += 1
      } else {
        buckets.set(key, {
          categoryId: r.category?.id ?? null,
          slug: r.category?.slug ?? null,
          name: r.category?.name ?? 'Sin categoría',
          parentSlug: r.category?.parent?.slug ?? null,
          totalUsd: absUsd,
          transactionCount: 1,
        })
      }
    }
    return Array.from(buckets.values())
      .map((b) => ({ ...b, totalUsd: Number(b.totalUsd.toFixed(2)) }))
      .sort((a, b) => b.totalUsd - a.totalUsd)
  }

  private async aggregateRange(tenantId: string, from: Date, to: Date): Promise<{
    incomeUsd: number
    expenseUsd: number
    netUsd: number
    transactionCount: number
  }> {
    const records = await this.prisma.record.findMany({
      where: {
        tenantId,
        isTransfer: false,
        occurredAt: { gte: from, lte: to },
      },
      select: {
        type: true,
        amount: true,
        currencyCode: true,
        occurredAt: true,
      },
    })

    let income = 0
    let expense = 0
    for (const r of records) {
      const usd = await this.exchange.toUsd(r.amount, r.currencyCode, r.occurredAt)
      if (usd === null) continue
      if (r.type === 'INCOME') income += usd
      else if (r.type === 'EXPENSE') expense += Math.abs(usd)
    }
    return {
      incomeUsd: Number(income.toFixed(2)),
      expenseUsd: Number(expense.toFixed(2)),
      netUsd: Number((income - expense).toFixed(2)),
      transactionCount: records.length,
    }
  }

  private previousFrom(from: Date, to: Date): Date {
    const span = to.getTime() - from.getTime()
    return new Date(from.getTime() - span)
  }
}
