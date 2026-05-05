import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { PrismaService } from '@/prisma/prisma.service'
import { JwtPayload } from './auth.service'

export interface AuthUser {
  id: string
  email: string
  role: string
  tenantId: string
  tenantSlug: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    })
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (payload.type !== 'access') throw new UnauthorizedException('Token type incorrecto')
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user || !user.isActive) throw new UnauthorizedException('Usuario inactivo')
    // Permitir override del tenant por header `X-Tenant-Slug` si el user es SUPERADMIN.
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: payload.tenantId,
      tenantSlug: payload.tenantSlug,
    }
  }
}
