import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { ExchangeService } from '@/exchange/exchange.service'
import { CreateAccountDto } from './dto/create-account.dto'
import { UpdateAccountDto } from './dto/update-account.dto'

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

  async create(tenantId: string, dto: CreateAccountDto) {
    await this.assertCurrency(dto.currencyCode)
    const dup = await this.prisma.account.findUnique({
      where: { tenantId_name: { tenantId, name: dto.name } },
    })
    if (dup) throw new ConflictException(`Ya existe una cuenta con el nombre "${dto.name}"`)
    return this.prisma.account.create({
      data: {
        tenantId,
        name: dto.name,
        currencyCode: dto.currencyCode,
        type: dto.type ?? 'GENERAL',
        color: dto.color ?? null,
        iconKey: dto.iconKey ?? null,
        initialBalance: dto.initialBalance ? new Prisma.Decimal(dto.initialBalance) : new Prisma.Decimal(0),
        cryptoAddress: dto.cryptoAddress ?? null,
        excludeFromTotals: dto.excludeFromTotals ?? false,
        position: dto.position ?? 0,
      },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateAccountDto) {
    const existing = await this.prisma.account.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException(`Cuenta ${id} no encontrada`)

    const data: Prisma.AccountUpdateInput = {}
    if (dto.name) {
      if (dto.name !== existing.name) {
        const dup = await this.prisma.account.findUnique({
          where: { tenantId_name: { tenantId, name: dto.name } },
        })
        if (dup) throw new ConflictException(`Ya existe una cuenta con el nombre "${dto.name}"`)
      }
      data.name = dto.name
    }
    if (dto.currencyCode && dto.currencyCode !== existing.currencyCode) {
      await this.assertCurrency(dto.currencyCode)
      data.currency = { connect: { code: dto.currencyCode } }
    }
    if (dto.type) data.type = dto.type
    if (dto.color !== undefined) data.color = dto.color
    if (dto.iconKey !== undefined) data.iconKey = dto.iconKey
    if (dto.initialBalance !== undefined) data.initialBalance = new Prisma.Decimal(dto.initialBalance)
    if (dto.cryptoAddress !== undefined) data.cryptoAddress = dto.cryptoAddress
    if (dto.excludeFromTotals !== undefined) data.excludeFromTotals = dto.excludeFromTotals
    if (dto.position !== undefined) data.position = dto.position
    if (dto.isArchived !== undefined) data.isArchived = dto.isArchived

    return this.prisma.account.update({ where: { id }, data })
  }

  async archive(tenantId: string, id: string): Promise<{ archived: true }> {
    const existing = await this.prisma.account.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException(`Cuenta ${id} no encontrada`)
    await this.prisma.account.update({ where: { id }, data: { isArchived: true } })
    return { archived: true }
  }

  /**
   * Cambia la moneda de una cuenta y, opcionalmente, propaga el cambio a TODOS
   * los records existentes de esa cuenta (útil para arreglar imports erróneos
   * como el caso "Banco ACAP Pesos" que entró como USD pero eran DOP).
   */
  async fixCurrency(tenantId: string, id: string, newCurrency: string): Promise<{ updatedRecords: number }> {
    const existing = await this.prisma.account.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException(`Cuenta ${id} no encontrada`)
    await this.assertCurrency(newCurrency)
    const result = await this.prisma.$transaction([
      this.prisma.account.update({ where: { id }, data: { currencyCode: newCurrency } }),
      this.prisma.record.updateMany({
        where: { accountId: id, tenantId },
        data: { currencyCode: newCurrency },
      }),
    ])
    return { updatedRecords: result[1].count }
  }

  private async assertCurrency(code: string): Promise<void> {
    const exists = await this.prisma.currency.findUnique({ where: { code } })
    if (!exists) throw new NotFoundException(`Moneda "${code}" no está en el catálogo`)
  }
}
