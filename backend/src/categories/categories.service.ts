import { Injectable } from '@nestjs/common'
import { Category, CategoryKind } from '@prisma/client'
import { PrismaService } from '@/prisma/prisma.service'

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
