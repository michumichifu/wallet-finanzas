import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common'
import { Request } from 'express'
import type { AuthUser } from '@/auth/jwt.strategy'

declare module 'express' {
  interface Request {
    tenantId?: string
    tenantSlug?: string
    user?: AuthUser
  }
}

/**
 * Param decorator que entrega el `tenantId` del request.
 * Resuelve desde:
 *   1. `request.user.tenantId` (puesto por JwtAuthGuard tras autenticación), o
 *   2. `request.tenantId` (puesto por TenantContextMiddleware en endpoints públicos legados).
 */
export const Tenant = createParamDecorator((_, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<Request>()
  const fromAuth = req.user?.tenantId
  const fromMiddleware = req.tenantId
  const tenantId = fromAuth ?? fromMiddleware
  if (!tenantId) {
    throw new InternalServerErrorException(
      'Tenant context no disponible. Endpoint protegido sin guard JWT, o middleware no aplicado.',
    )
  }
  return tenantId
})

/** Devuelve el `AuthUser` del request (requiere JwtAuthGuard). */
export const CurrentUser = createParamDecorator((_, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest<Request>()
  if (!req.user) {
    throw new InternalServerErrorException('No hay user en el request. ¿Falta JwtAuthGuard?')
  }
  return req.user
})
