import { Injectable } from '@nestjs/common'
import { Prisma, RecordType } from '@prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { ExchangeService } from '@/exchange/exchange.service'

export interface RecordListQuery {
  from?: Date
  to?: Date
  accountId?: string
  categoryId?: string
  type?: RecordType
  search?: string
  page?: number
  pageSize?: number
}

export interface RecordListItem {
  id: string
  type: RecordType
  amount: string
  currencyCode: string
  amountUsd: number | null
  occurredAt: string
  note: string | null
  payee: string | null
  paymentType: string
  isTransfer: boolean
  account: { id: string; name: string; currencyCode: string }
  category: { id: string; name: string; slug: string } | null
}

const MAX_PAGE_SIZE = 200

@Injectable()
export class RecordsService {
  constructor(private readonly prisma: PrismaService, private readonly exchange: ExchangeService) {}

  async list(tenantId: string, query: RecordListQuery): Promise<{
    items: RecordListItem[]
    total: number
    page: number
    pageSize: number
  }> {
    const page = Math.max(1, query.page ?? 1)
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? 50))

    const where: Prisma.RecordWhereInput = {
      tenantId,
      ...(query.accountId ? { accountId: query.accountId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.from || query.to
        ? {
            occurredAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { note: { contains: query.search, mode: 'insensitive' as const } },
              { payee: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.record.count({ where }),
      this.prisma.record.findMany({
        where,
        include: {
          account: { select: { id: true, name: true, currencyCode: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    const items: RecordListItem[] = await Promise.all(
      rows.map(async (r) => {
        const amountUsd = await this.exchange.toUsd(r.amount, r.currencyCode, r.occurredAt)
        return {
          id: r.id,
          type: r.type,
          amount: r.amount.toFixed(8).replace(/\.?0+$/, ''),
          currencyCode: r.currencyCode,
          amountUsd: amountUsd === null ? null : Number(amountUsd.toFixed(2)),
          occurredAt: r.occurredAt.toISOString(),
          note: r.note,
          payee: r.payee,
          paymentType: r.paymentType,
          isTransfer: r.isTransfer,
          account: r.account,
          category: r.category,
        }
      }),
    )

    return { items, total, page, pageSize }
  }
}
