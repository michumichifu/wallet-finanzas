import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { AutomaticRule, Prisma } from '@prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateRuleDto } from './dto/create-rule.dto'
import { UpdateRuleDto } from './dto/update-rule.dto'
import { evaluateRule, type RuleAction, type RuleCondition, type RecordCandidate } from './dto/rule-condition'

export interface RuleView {
  id: string
  name: string
  condition: RuleCondition
  action: RuleAction
  categoryId: string | null
  isActive: boolean
  priority: number
  createdAt: string
}

@Injectable()
export class RulesService {
  private readonly logger = new Logger(RulesService.name)

  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string): Promise<RuleView[]> {
    const rows = await this.prisma.automaticRule.findMany({
      where: { tenantId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    })
    return rows.map(this.toView)
  }

  async create(tenantId: string, dto: CreateRuleDto): Promise<RuleView> {
    if (dto.categoryId) {
      const cat = await this.prisma.category.findFirst({ where: { id: dto.categoryId, tenantId } })
      if (!cat) throw new ForbiddenException('categoryId no pertenece al tenant')
    }
    if (dto.action.setCategoryId) {
      const cat = await this.prisma.category.findFirst({ where: { id: dto.action.setCategoryId, tenantId } })
      if (!cat) throw new ForbiddenException('action.setCategoryId no pertenece al tenant')
    }
    const r = await this.prisma.automaticRule.create({
      data: {
        tenantId,
        name: dto.name,
        condition: dto.condition as unknown as Prisma.InputJsonValue,
        action: dto.action as unknown as Prisma.InputJsonValue,
        categoryId: dto.categoryId ?? null,
        isActive: dto.isActive ?? true,
        priority: dto.priority ?? 100,
      },
    })
    return this.toView(r)
  }

  async update(tenantId: string, id: string, dto: UpdateRuleDto): Promise<RuleView> {
    const existing = await this.prisma.automaticRule.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException(`Regla ${id} no encontrada`)
    const data: Prisma.AutomaticRuleUpdateInput = {}
    if (dto.name !== undefined) data.name = dto.name
    if (dto.condition !== undefined) data.condition = dto.condition as unknown as Prisma.InputJsonValue
    if (dto.action !== undefined) {
      if (dto.action.setCategoryId) {
        const cat = await this.prisma.category.findFirst({ where: { id: dto.action.setCategoryId, tenantId } })
        if (!cat) throw new ForbiddenException('action.setCategoryId no pertenece al tenant')
      }
      data.action = dto.action as unknown as Prisma.InputJsonValue
    }
    if (dto.categoryId !== undefined) {
      if (dto.categoryId === null) {
        data.category = { disconnect: true }
      } else {
        data.category = { connect: { id: dto.categoryId } }
      }
    }
    if (dto.isActive !== undefined) data.isActive = dto.isActive
    if (dto.priority !== undefined) data.priority = dto.priority
    const r = await this.prisma.automaticRule.update({ where: { id }, data })
    return this.toView(r)
  }

  async remove(tenantId: string, id: string): Promise<{ deleted: true }> {
    const existing = await this.prisma.automaticRule.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException(`Regla ${id} no encontrada`)
    await this.prisma.automaticRule.delete({ where: { id } })
    return { deleted: true }
  }

  /**
   * Evalúa todas las reglas activas del tenant contra un record candidato.
   * Retorna la mutación a aplicar (o null si nada matchea). La primera regla
   * que matchea (orden por priority asc, luego createdAt desc) gana.
   */
  async evaluateForRecord(
    tenantId: string,
    candidate: RecordCandidate,
  ): Promise<{ ruleId: string; action: RuleAction } | null> {
    const rules = await this.prisma.automaticRule.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    })
    for (const r of rules) {
      const cond = r.condition as unknown as RuleCondition
      if (!cond?.items?.length) continue
      if (evaluateRule(cond, candidate)) {
        return { ruleId: r.id, action: r.action as unknown as RuleAction }
      }
    }
    return null
  }

  /**
   * Aplica reglas contra TODOS los records del tenant. Por seguridad solo
   * sobreescribe records SIN categoría a menos que `overwriteAll` sea true.
   * Devuelve cuántos records se modificaron.
   */
  async applyAll(
    tenantId: string,
    options: { overwriteAll?: boolean } = {},
  ): Promise<{ scanned: number; updated: number }> {
    const records = await this.prisma.record.findMany({
      where: {
        tenantId,
        isTransfer: false,
        ...(options.overwriteAll ? {} : { categoryId: null }),
      },
      select: {
        id: true,
        type: true,
        amount: true,
        currencyCode: true,
        note: true,
        payee: true,
        accountId: true,
        paymentType: true,
        categoryId: true,
      },
    })

    let updated = 0
    for (const r of records) {
      const candidate: RecordCandidate = {
        id: r.id,
        type: r.type,
        amount: Number(r.amount),
        currencyCode: r.currencyCode,
        note: r.note,
        payee: r.payee,
        accountId: r.accountId,
        paymentType: r.paymentType,
        categoryId: r.categoryId,
      }
      const match = await this.evaluateForRecord(tenantId, candidate)
      if (!match) continue
      const action = match.action
      if (action.setCategoryId !== undefined) {
        await this.prisma.record.update({
          where: { id: r.id },
          data: { categoryId: action.setCategoryId },
        })
        updated++
      }
    }
    return { scanned: records.length, updated }
  }

  private toView(r: AutomaticRule): RuleView {
    return {
      id: r.id,
      name: r.name,
      condition: r.condition as unknown as RuleCondition,
      action: r.action as unknown as RuleAction,
      categoryId: r.categoryId,
      isActive: r.isActive,
      priority: r.priority,
      createdAt: r.createdAt.toISOString(),
    }
  }
}
