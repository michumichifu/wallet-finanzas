import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, RecordType } from '@prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateTemplateDto } from './dto/create-template.dto'

interface TemplatePayload {
  type: RecordType
  accountId: string
  categoryId?: string | null
  amount: number
  currencyCode: string
  payee?: string | null
  note?: string | null
}

export interface TemplateView {
  id: string
  name: string
  type: RecordType
  amount: number
  currencyCode: string
  accountId: string
  categoryId: string | null
  payee: string | null
  note: string | null
  createdAt: string
}

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string): Promise<TemplateView[]> {
    const rows = await this.prisma.template.findMany({
      where: { tenantId },
      orderBy: [{ createdAt: 'desc' }],
    })
    return rows.map((r) => this.toView(r.id, r.name, r.payload, r.categoryId, r.createdAt))
  }

  async create(tenantId: string, dto: CreateTemplateDto): Promise<TemplateView> {
    const account = await this.prisma.account.findFirst({ where: { id: dto.accountId, tenantId } })
    if (!account) throw new ForbiddenException('accountId no pertenece al tenant')
    if (dto.categoryId) {
      const cat = await this.prisma.category.findFirst({ where: { id: dto.categoryId, tenantId } })
      if (!cat) throw new ForbiddenException('categoryId no pertenece al tenant')
    }
    const payload: TemplatePayload = {
      type: dto.type,
      accountId: dto.accountId,
      categoryId: dto.categoryId ?? null,
      amount: dto.amount,
      currencyCode: dto.currencyCode,
      payee: dto.payee ?? null,
      note: dto.note ?? null,
    }
    const t = await this.prisma.template.create({
      data: {
        tenantId,
        name: dto.name,
        payload: payload as unknown as Prisma.InputJsonValue,
        categoryId: dto.categoryId ?? null,
      },
    })
    return this.toView(t.id, t.name, t.payload, t.categoryId, t.createdAt)
  }

  async remove(tenantId: string, id: string): Promise<{ deleted: true }> {
    const existing = await this.prisma.template.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException(`Template ${id} no encontrado`)
    await this.prisma.template.delete({ where: { id } })
    return { deleted: true }
  }

  /** Aplica la plantilla creando un nuevo record con `occurredAt = now`. */
  async apply(tenantId: string, id: string, occurredAtIso?: string) {
    const t = await this.prisma.template.findFirst({ where: { id, tenantId } })
    if (!t) throw new NotFoundException(`Template ${id} no encontrado`)
    const p = t.payload as unknown as TemplatePayload
    const account = await this.prisma.account.findFirst({ where: { id: p.accountId, tenantId } })
    if (!account) throw new NotFoundException('Cuenta de la plantilla ya no existe')

    let amount = p.amount
    if (p.type === RecordType.EXPENSE && amount > 0) amount = -amount
    if (p.type === RecordType.INCOME && amount < 0) amount = -amount

    return this.prisma.record.create({
      data: {
        tenantId,
        accountId: p.accountId,
        categoryId: p.categoryId ?? null,
        type: p.type,
        amount: new Prisma.Decimal(amount),
        currencyCode: p.currencyCode,
        paymentType: 'CASH',
        payee: p.payee ?? null,
        note: p.note ?? null,
        occurredAt: occurredAtIso ? new Date(occurredAtIso) : new Date(),
        isTransfer: false,
      },
    })
  }

  private toView(
    id: string,
    name: string,
    payload: Prisma.JsonValue,
    categoryId: string | null,
    createdAt: Date,
  ): TemplateView {
    const p = payload as unknown as TemplatePayload
    return {
      id,
      name,
      type: p.type,
      amount: p.amount,
      currencyCode: p.currencyCode,
      accountId: p.accountId,
      categoryId,
      payee: p.payee ?? null,
      note: p.note ?? null,
      createdAt: createdAt.toISOString(),
    }
  }
}
