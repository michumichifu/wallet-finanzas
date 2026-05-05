import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common'
import { Request } from 'express'

/**
 * Param decorator que entrega el `tenantId` resuelto por TenantContextMiddleware.
 *
 *   @Get()
 *   list(@Tenant() tenantId: string) { ... }
 */
export const Tenant = createParamDecorator((_, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<Request>()
  if (!req.tenantId) {
    throw new InternalServerErrorException(
      'Tenant context no disponible. ¿Faltó registrar TenantContextMiddleware?',
    )
  }
  return req.tenantId
})
