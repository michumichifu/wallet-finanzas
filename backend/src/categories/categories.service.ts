import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Category, CategoryKind, Prisma } from '@prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'

export interface CategoryNode {
  id: string
  slug: string
  name: string
  kind: CategoryKind
  color: string | null
  iconKey: string | null
  position: number
  children: CategoryNode[]
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Devuelve árbol de categorías del tenant (padres con hijos anidados). */
  async treeForTenant(tenantId: string): Promise<CategoryNode[]> {
    const cats = await this.prisma.category.findMany({
      where: { tenantId, isArchived: false, isSystem: false },
      orderBy: [{ position: 'asc' }],
    })
    return this.buildTree(cats)
  }

  /** Lista plana (todas las cat). Útil para selectores en frontend. */
  async listForTenant(tenantId: string): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { tenantId, isArchived: false },
      orderBy: [{ position: 'asc' }],
    })
  }

  async create(tenantId: string, dto: CreateCategoryDto): Promise<Category> {
    const slug = (dto.slug ?? this.slugify(dto.name)).toLowerCase()
    if (!slug) throw new BadRequestException('Slug inválido')
    const dup = await this.prisma.category.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
    })
    if (dup) throw new ConflictException(`Ya existe una categoría con slug "${slug}"`)
    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({ where: { id: dto.parentId, tenantId } })
      if (!parent) throw new ForbiddenException('parentId no pertenece al tenant')
    }
    return this.prisma.category.create({
      data: {
        tenantId,
        slug,
        name: dto.name,
        kind: dto.kind ?? CategoryKind.EXPENSE,
        parentId: dto.parentId ?? null,
        color: dto.color ?? null,
        iconKey: dto.iconKey ?? null,
        position: dto.position ?? 0,
      },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateCategoryDto): Promise<Category> {
    const existing = await this.prisma.category.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException(`Categoría ${id} no encontrada`)
    if (existing.isSystem && (dto.slug || dto.kind)) {
      throw new BadRequestException('No se puede cambiar slug o kind de categorías de sistema')
    }
    const data: Prisma.CategoryUpdateInput = {}
    if (dto.name !== undefined) data.name = dto.name
    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      const dup = await this.prisma.category.findUnique({
        where: { tenantId_slug: { tenantId, slug: dto.slug } },
      })
      if (dup) throw new ConflictException(`Ya existe una categoría con slug "${dto.slug}"`)
      data.slug = dto.slug
    }
    if (dto.kind !== undefined) data.kind = dto.kind
    if (dto.parentId !== undefined) {
      if (dto.parentId === null) {
        data.parent = { disconnect: true }
      } else {
        if (dto.parentId === id) throw new BadRequestException('Categoría no puede ser su propio padre')
        const parent = await this.prisma.category.findFirst({ where: { id: dto.parentId, tenantId } })
        if (!parent) throw new ForbiddenException('parentId no pertenece al tenant')
        data.parent = { connect: { id: dto.parentId } }
      }
    }
    if (dto.color !== undefined) data.color = dto.color
    if (dto.iconKey !== undefined) data.iconKey = dto.iconKey
    if (dto.position !== undefined) data.position = dto.position
    if (dto.isArchived !== undefined) data.isArchived = dto.isArchived
    return this.prisma.category.update({ where: { id }, data })
  }

  /**
   * Borrar es destructivo: si hay records vinculados, fallamos. Para evitar pérdida
   * silenciosa, pedimos archivar en lugar de borrar cuando hay uso.
   */
  async remove(tenantId: string, id: string): Promise<{ archived: boolean; deleted: boolean }> {
    const existing = await this.prisma.category.findFirst({ where: { id, tenantId } })
    if (!existing) throw new NotFoundException(`Categoría ${id} no encontrada`)
    if (existing.isSystem) throw new BadRequestException('No se puede eliminar una categoría de sistema')

    const usage = await this.prisma.record.count({ where: { tenantId, categoryId: id } })
    const childCount = await this.prisma.category.count({ where: { tenantId, parentId: id } })
    if (usage > 0 || childCount > 0) {
      // Soft archive si tiene uso.
      await this.prisma.category.update({ where: { id }, data: { isArchived: true } })
      return { archived: true, deleted: false }
    }
    await this.prisma.category.delete({ where: { id } })
    return { archived: false, deleted: true }
  }

  private slugify(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  private buildTree(cats: Category[]): CategoryNode[] {
    const byId = new Map<string, CategoryNode>()
    const roots: CategoryNode[] = []

    for (const c of cats) {
      byId.set(c.id, {
        id: c.id,
        slug: c.slug,
        name: c.name,
        kind: c.kind,
        color: c.color,
        iconKey: c.iconKey,
        position: c.position,
        children: [],
      })
    }
    for (const c of cats) {
      const node = byId.get(c.id)!
      if (c.parentId && byId.has(c.parentId)) {
        byId.get(c.parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    }
    return roots
  }
}
