import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, RateSource, RecordType } from '@prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { ExchangeService } from '@/exchange/exchange.service'
import { RulesService } from '@/rules/rules.service'
import { CreateRecordDto } from './dto/create-record.dto'
import { UpdateRecordDto } from './dto/update-record.dto'
import { CreateTransferDto } from './dto/create-transfer.dto'

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchange: ExchangeService,
    private readonly rules: RulesService,
  ) {}

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

  async getOne(tenantId: string, id: string) {
    const r = await this.prisma.record.findFirst({
      where: { id, tenantId },
      include: {
        account: { select: { id: true, name: true, currencyCode: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    })
    if (!r) throw new NotFoundException(`Record ${id} no encontrado`)
    const amountUsd = await this.exchange.toUsd(r.amount, r.currencyCode, r.occurredAt)
    return {
      ...r,
      amount: r.amount.toFixed(8).replace(/\.?0+$/, ''),
      amountUsd: amountUsd === null ? null : Number(amountUsd.toFixed(2)),
      occurredAt: r.occurredAt.toISOString(),
    }
  }

  async create(tenantId: string, dto: CreateRecordDto) {
    if (dto.type === RecordType.TRANSFER) {
      throw new BadRequestException('Para transferencias usa POST /api/records/transfer')
    }
    // Validar cuenta del tenant + match de moneda.
    const account = await this.prisma.account.findFirst({ where: { id: dto.accountId, tenantId } })
    if (!account) throw new ForbiddenException('Cuenta no pertenece al tenant')
    if (dto.currencyCode !== account.currencyCode) {
      // Permitido pero advertencia: el monto debería estar en moneda de la cuenta.
      // Para mantener consistencia con Wallet, forzamos coincidencia.
      throw new BadRequestException(
        `currencyCode (${dto.currencyCode}) debe coincidir con la moneda de la cuenta (${account.currencyCode})`,
      )
    }
    if (dto.categoryId) {
      const cat = await this.prisma.category.findFirst({ where: { id: dto.categoryId, tenantId } })
      if (!cat) throw new ForbiddenException('Categoría no pertenece al tenant')
    }

    // Asegurar signo: EXPENSE negativo, INCOME positivo.
    let amount = dto.amount
    if (dto.type === RecordType.EXPENSE && amount > 0) amount = -amount
    if (dto.type === RecordType.INCOME && amount < 0) amount = -amount

    // Auto-categorizar via reglas si el user no especificó categoría.
    let finalCategoryId = dto.categoryId ?? null
    if (!finalCategoryId) {
      const match = await this.rules.evaluateForRecord(tenantId, {
        type: dto.type,
        amount,
        currencyCode: dto.currencyCode,
        note: dto.note ?? null,
        payee: dto.payee ?? null,
        accountId: dto.accountId,
        paymentType: dto.paymentType ?? 'CASH',
        categoryId: null,
      })
      if (match?.action.setCategoryId) finalCategoryId = match.action.setCategoryId
    }

    return this.prisma.record.create({
      data: {
        tenantId,
        accountId: dto.accountId,
        categoryId: finalCategoryId,
        type: dto.type,
        amount: new Prisma.Decimal(amount),
        currencyCode: dto.currencyCode,
        paymentType: dto.paymentType ?? 'CASH',
        paymentTypeLabel: dto.paymentTypeLabel ?? null,
        payee: dto.payee ?? null,
        note: dto.note ?? null,
        occurredAt: new Date(dto.occurredAt),
        isDraft: dto.isDraft ?? false,
        isTransfer: false,
      },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateRecordDto) {
    const existing = await this.prisma.record.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException(`Record ${id} no encontrado`)
    if (existing.isTransfer) {
      throw new BadRequestException('No se pueden editar transferencias directamente. Borrar y recrear.')
    }

    const data: Prisma.RecordUpdateInput = {}
    if (dto.accountId) {
      const account = await this.prisma.account.findFirst({ where: { id: dto.accountId, tenantId } })
      if (!account) throw new ForbiddenException('Cuenta no pertenece al tenant')
      data.account = { connect: { id: dto.accountId } }
    }
    if (dto.categoryId !== undefined) {
      if (dto.categoryId === null) {
        data.category = { disconnect: true }
      } else {
        const cat = await this.prisma.category.findFirst({ where: { id: dto.categoryId, tenantId } })
        if (!cat) throw new ForbiddenException('Categoría no pertenece al tenant')
        data.category = { connect: { id: dto.categoryId } }
      }
    }
    if (dto.type) data.type = dto.type
    if (dto.amount !== undefined) {
      let amount = dto.amount
      const finalType = dto.type ?? existing.type
      if (finalType === RecordType.EXPENSE && amount > 0) amount = -amount
      if (finalType === RecordType.INCOME && amount < 0) amount = -amount
      data.amount = new Prisma.Decimal(amount)
    }
    if (dto.currencyCode) data.currency = { connect: { code: dto.currencyCode } }
    if (dto.paymentType) data.paymentType = dto.paymentType
    if (dto.paymentTypeLabel !== undefined) data.paymentTypeLabel = dto.paymentTypeLabel
    if (dto.payee !== undefined) data.payee = dto.payee
    if (dto.note !== undefined) data.note = dto.note
    if (dto.occurredAt) data.occurredAt = new Date(dto.occurredAt)
    if (dto.isDraft !== undefined) data.isDraft = dto.isDraft

    return this.prisma.record.update({ where: { id }, data })
  }

  async remove(tenantId: string, id: string): Promise<{ deleted: number }> {
    const existing = await this.prisma.record.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException(`Record ${id} no encontrado`)

    if (existing.isTransfer && existing.transferPairId) {
      // Borra el par completo + el TransferPair.
      await this.prisma.$transaction([
        this.prisma.record.deleteMany({
          where: { tenantId, transferPairId: existing.transferPairId },
        }),
        this.prisma.transferPair.delete({ where: { id: existing.transferPairId } }),
      ])
      return { deleted: 2 }
    }

    await this.prisma.record.delete({ where: { id } })
    return { deleted: 1 }
  }

  async createTransfer(tenantId: string, dto: CreateTransferDto): Promise<{ transferPairId: string }> {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException('Las cuentas origen y destino deben ser diferentes')
    }
    if (dto.fromAmount <= 0 || dto.toAmount <= 0) {
      throw new BadRequestException('Los montos deben ser positivos (representan transferencia)')
    }

    const [from, to] = await Promise.all([
      this.prisma.account.findFirst({ where: { id: dto.fromAccountId, tenantId } }),
      this.prisma.account.findFirst({ where: { id: dto.toAccountId, tenantId } }),
    ])
    if (!from || !to) throw new ForbiddenException('Una de las cuentas no pertenece al tenant')

    // Categoría sintética TRANSFER.
    const transferCat = await this.prisma.category.findFirst({
      where: { tenantId, slug: 'transfer' },
    })

    const occurred = new Date(dto.occurredAt)
    const sameCurrency = from.currencyCode === to.currencyCode
    const appliedRate = sameCurrency ? new Prisma.Decimal(1) : new Prisma.Decimal((dto.toAmount / dto.fromAmount).toFixed(12))
    const rateSource: RateSource = sameCurrency ? RateSource.MANUAL : RateSource.MANUAL

    const pair = await this.prisma.transferPair.create({
      data: {
        tenantId,
        appliedRate,
        rateSource,
        notes: dto.note ?? null,
        occurredAt: occurred,
      },
    })

    await this.prisma.record.createMany({
      data: [
        {
          tenantId,
          accountId: from.id,
          categoryId: transferCat?.id ?? null,
          type: RecordType.TRANSFER,
          amount: new Prisma.Decimal(-dto.fromAmount),
          currencyCode: from.currencyCode,
          paymentType: 'CASH',
          note: dto.note ?? null,
          occurredAt: occurred,
          isTransfer: true,
          transferPairId: pair.id,
        },
        {
          tenantId,
          accountId: to.id,
          categoryId: transferCat?.id ?? null,
          type: RecordType.TRANSFER,
          amount: new Prisma.Decimal(dto.toAmount),
          currencyCode: to.currencyCode,
          paymentType: 'CASH',
          note: dto.note ?? null,
          occurredAt: occurred,
          isTransfer: true,
          transferPairId: pair.id,
        },
      ],
    })

    return { transferPairId: pair.id }
  }
}
