import { Injectable, Logger, NestMiddleware, NotFoundException } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { PrismaService } from '@/prisma/prisma.service'

/**
 * Middleware temporal (pre-auth) que resuelve el tenant a partir del header
 * `x-tenant-slug` o, en su defecto, usa el tenant default `luis`.
 *
 * Cuando se implemente auth (fase futura), este middleware se reemplaza por
 * un guard que extrae `tenantId` del JWT.
 */
declare module 'express' {
  interface Request {
    tenantId?: string
    tenantSlug?: string
  }
}

const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG ?? 'luis'

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name)
  private readonly cache = new Map<string, string>()

  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const headerSlug = (req.headers['x-tenant-slug'] as string | undefined)?.trim()
    const slug = headerSlug && headerSlug.length > 0 ? headerSlug : DEFAULT_TENANT_SLUG

    let tenantId = this.cache.get(slug)
    if (!tenantId) {
      const tenant = await this.prisma.tenant.findUnique({ where: { slug } })
      if (!tenant) throw new NotFoundException(`Tenant "${slug}" no encontrado`)
      tenantId = tenant.id
      this.cache.set(slug, tenantId)
    }
    req.tenantId = tenantId
    req.tenantSlug = slug
    next()
  }
}
