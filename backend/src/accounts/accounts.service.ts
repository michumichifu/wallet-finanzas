import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
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
  bankName: string | null
  color: string | null
  iconKey: string | null
  iconColor: string | null
  photoUrl: string | null
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
          bankName: a.bankName,
          color: a.color,
          iconKey: a.iconKey,
          iconColor: a.iconColor,
          photoUrl: a.photoUrl,
          excludeFromTotals: a.excludeFromTotals,
          isArchived: a.isArchived,
          position: a.position,
          balance: native.toFixed(8).replace(/\.?0+$/, ''),
          balanceUsd: balanceUsd === null ? null : Number(balanceUsd.toFixed(2)),
        }
      }),
    )
  }

  async getOne(tenantId: string, id: string): Promise<AccountListItem> {
    const a = await this.prisma.account.findFirst({ where: { id, tenantId } })
    if (!a) throw new NotFoundException(`Cuenta ${id} no encontrada`)
    const sum = await this.prisma.record.aggregate({
      where: { tenantId, accountId: id },
      _sum: { amount: true },
    })
    const native = (sum._sum.amount ?? new Prisma.Decimal(0)).plus(a.initialBalance)
    const balanceUsd = await this.exchange.toUsd(native, a.currencyCode, new Date())
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      currencyCode: a.currencyCode,
      bankName: a.bankName,
      color: a.color,
      iconKey: a.iconKey,
      iconColor: a.iconColor,
      photoUrl: a.photoUrl,
      excludeFromTotals: a.excludeFromTotals,
      isArchived: a.isArchived,
      position: a.position,
      balance: native.toFixed(8).replace(/\.?0+$/, ''),
      balanceUsd: balanceUsd === null ? null : Number(balanceUsd.toFixed(2)),
    }
  }

  /**
   * Devuelve la serie de saldos diarios entre [from, to]. El saldo en cada día
   * es el saldo acumulado al final de ese día (sumando initialBalance + todos
   * los records con occurredAt <= endOfDay).
   */
  async balanceHistory(
    tenantId: string,
    id: string,
    options: { from: Date; to: Date },
  ): Promise<{ points: { date: string; balance: number; balanceUsd: number | null }[] }> {
    const account = await this.prisma.account.findFirst({ where: { id, tenantId } })
    if (!account) throw new NotFoundException(`Cuenta ${id} no encontrada`)

    // Records hasta el final de cada día. Para eficiencia traemos todos
    // los records hasta `to` y luego los agrupamos por día.
    const records = await this.prisma.record.findMany({
      where: { tenantId, accountId: id, occurredAt: { lte: options.to } },
      select: { amount: true, occurredAt: true },
      orderBy: { occurredAt: 'asc' },
    })

    // Saldo acumulado anterior a `from` = initialBalance + records antes de `from`.
    let runningBalance = Number(account.initialBalance)
    const beforeFrom: typeof records = []
    const afterFrom: typeof records = []
    for (const r of records) {
      if (r.occurredAt < options.from) beforeFrom.push(r)
      else afterFrom.push(r)
    }
    for (const r of beforeFrom) runningBalance += Number(r.amount)

    // Generar 1 punto por día entre from y to (inclusive).
    const points: { date: string; balance: number; balanceUsd: number | null }[] = []
    const cursor = new Date(options.from.getFullYear(), options.from.getMonth(), options.from.getDate())
    const end = new Date(options.to.getFullYear(), options.to.getMonth(), options.to.getDate())
    let recordIdx = 0
    while (cursor <= end) {
      const endOfDay = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 23, 59, 59)
      while (recordIdx < afterFrom.length && afterFrom[recordIdx]!.occurredAt <= endOfDay) {
        runningBalance += Number(afterFrom[recordIdx]!.amount)
        recordIdx++
      }
      const balanceUsd = await this.exchange.toUsd(runningBalance, account.currencyCode, endOfDay)
      points.push({
        date: cursor.toISOString().slice(0, 10),
        balance: Number(runningBalance.toFixed(8)),
        balanceUsd: balanceUsd === null ? null : Number(balanceUsd.toFixed(2)),
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    return { points }
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
        bankName: dto.bankName ?? null,
        color: dto.color ?? null,
        iconKey: dto.iconKey ?? null,
        iconColor: dto.iconColor ?? null,
        photoUrl: dto.photoUrl ?? null,
        initialBalance: dto.initialBalance !== undefined ? new Prisma.Decimal(dto.initialBalance) : new Prisma.Decimal(0),
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
      // Política: una vez creada la cuenta, la moneda NO se puede cambiar
      // desde el endpoint normal de update — usar `fix-currency` que también
      // propaga el cambio a todos los records existentes.
      throw new BadRequestException(
        'No se puede cambiar la moneda desde editar. Usa el endpoint /accounts/:id/fix-currency si es para corregir un import erróneo.',
      )
    }
    if (dto.type) data.type = dto.type
    if (dto.bankName !== undefined) data.bankName = dto.bankName
    if (dto.color !== undefined) data.color = dto.color
    if (dto.iconKey !== undefined) data.iconKey = dto.iconKey
    if (dto.iconColor !== undefined) data.iconColor = dto.iconColor
    if (dto.photoUrl !== undefined) data.photoUrl = dto.photoUrl
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
