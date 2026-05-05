import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { CURRENCY_SEED } from './currencies.seed'
import { flattenWalletCategoryTree } from './wallet-categories.seed'

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name)

  constructor(private readonly prisma: PrismaService) {}

  /** Idempotente. Pueblas el catálogo global de monedas. */
  async seedCurrencies(): Promise<{ created: number; updated: number }> {
    let created = 0
    let updated = 0
    for (const c of CURRENCY_SEED) {
      const result = await this.prisma.currency.upsert({
        where: { code: c.code },
        create: {
          code: c.code,
          kind: c.kind,
          name: c.name,
          symbol: c.symbol,
          decimals: c.decimals,
          cryptoNetwork: c.cryptoNetwork,
        },
        update: {
          kind: c.kind,
          name: c.name,
          symbol: c.symbol,
          decimals: c.decimals,
          cryptoNetwork: c.cryptoNetwork,
        },
      })
      if (result.createdAt.getTime() === result.createdAt.getTime() /* always true */) {
        // Prisma upsert no nos dice si fue create o update; consultamos por la diferencia
        // entre createdAt y now para una heurística simple.
        const ageMs = Date.now() - result.createdAt.getTime()
        if (ageMs < 1000) created++
        else updated++
      }
    }
    this.logger.log(`Currencies seeded: ${created} created, ${updated} updated, ${CURRENCY_SEED.length} total`)
    return { created, updated }
  }

  /**
   * Siembra el árbol de categorías estándar de Wallet en un tenant dado.
   * Idempotente: si una categoría con el mismo slug ya existe, se omite.
   */
  async seedWalletCategoriesForTenant(tenantId: string): Promise<{ created: number; skipped: number }> {
    const flat = flattenWalletCategoryTree()
    let created = 0
    let skipped = 0

    // Mapa slug → id que va creciendo a medida que insertamos padres.
    const slugToId = new Map<string, string>()

    for (const node of flat) {
      const existing = await this.prisma.category.findUnique({
        where: { tenantId_slug: { tenantId, slug: node.slug } },
      })
      if (existing) {
        slugToId.set(node.slug, existing.id)
        skipped++
        continue
      }
      const parentId = node.parentSlug ? slugToId.get(node.parentSlug) : undefined
      const cat = await this.prisma.category.create({
        data: {
          tenantId,
          slug: node.slug,
          name: node.name,
          kind: node.kind,
          parentId: parentId ?? null,
          walletEnvelopeId: node.walletEnvelopeId,
          isSystem: node.slug === 'transfer',
          position: node.position,
        },
      })
      slugToId.set(node.slug, cat.id)
      created++
    }
    this.logger.log(`Categories seeded for tenant ${tenantId}: ${created} created, ${skipped} skipped`)
    return { created, skipped }
  }
}
