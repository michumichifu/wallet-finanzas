import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { User, UserRole } from '@prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { CatalogService } from '@/catalog/catalog.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    displayName: string | null
    role: UserRole
  }
  /** Tenant default del usuario para el client elegir en el primer load. */
  defaultTenant: { id: string; slug: string; name: string } | null
}

export interface JwtPayload {
  sub: string // userId
  email: string
  role: UserRole
  tenantId: string
  tenantSlug: string
  type: 'access' | 'refresh'
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly catalog: CatalogService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } })
    if (exists) throw new ConflictException('Ya existe una cuenta con ese email')

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const slug = (dto.tenantSlug ?? dto.email.split('@')[0]).toLowerCase().replace(/[^a-z0-9-]+/g, '-')
    const slugExists = await this.prisma.tenant.findUnique({ where: { slug } })
    const finalSlug = slugExists ? `${slug}-${Math.random().toString(36).slice(2, 6)}` : slug

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        displayName: dto.displayName ?? null,
        role: UserRole.TENANT_OWNER,
      },
    })
    const tenant = await this.prisma.tenant.create({
      data: {
        slug: finalSlug,
        name: dto.displayName ?? dto.email,
        ownerId: user.id,
      },
    })
    await this.prisma.tenantMembership.create({
      data: { userId: user.id, tenantId: tenant.id, role: UserRole.TENANT_OWNER },
    })
    await this.catalog.seedCurrencies()
    await this.catalog.seedWalletCategoriesForTenant(tenant.id)

    return this.issueTokens(user, tenant.id, tenant.slug, tenant)
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } })
    if (!user || !user.isActive) throw new UnauthorizedException('Credenciales inválidas')
    const ok = await bcrypt.compare(dto.password, user.passwordHash)
    if (!ok) throw new UnauthorizedException('Credenciales inválidas')

    const tenant = await this.resolveDefaultTenant(user)
    if (!tenant) throw new UnauthorizedException('Usuario sin tenant — contacta a soporte')
    return this.issueTokens(user, tenant.id, tenant.slug, tenant)
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      })
    } catch {
      throw new UnauthorizedException('Refresh token inválido')
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Token type incorrecto')
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user || !user.isActive) throw new UnauthorizedException('Usuario inactivo o eliminado')
    const tenant = await this.prisma.tenant.findUnique({ where: { id: payload.tenantId } })
    if (!tenant) throw new UnauthorizedException('Tenant ya no disponible')
    return this.issueTokens(user, tenant.id, tenant.slug, tenant)
  }

  async me(userId: string, tenantId: string) {
    const [user, tenant, memberships] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      this.prisma.tenantMembership.findMany({
        where: { userId },
        include: { tenant: { select: { id: true, slug: true, name: true } } },
      }),
    ])
    if (!user || !tenant) throw new UnauthorizedException('Sesión inválida')
    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
      tenants: memberships.map((m) => m.tenant),
    }
  }

  private async resolveDefaultTenant(user: User) {
    if (user.role === UserRole.SUPERADMIN) {
      // Si superadmin, intentar primero un tenant donde sea owner; si no, primero por slug.
      const owned = await this.prisma.tenant.findFirst({ where: { ownerId: user.id }, orderBy: { slug: 'asc' } })
      if (owned) return owned
      return this.prisma.tenant.findFirst({ orderBy: { slug: 'asc' } })
    }
    const membership = await this.prisma.tenantMembership.findFirst({
      where: { userId: user.id },
      include: { tenant: true },
      orderBy: { joinedAt: 'asc' },
    })
    return membership?.tenant ?? null
  }

  private async issueTokens(
    user: User,
    tenantId: string,
    tenantSlug: string,
    tenant: { id: string; slug: string; name: string },
  ): Promise<AuthTokens> {
    const accessSecret = this.config.getOrThrow<string>('JWT_SECRET')
    const refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET')
    const accessExpiresIn = (this.config.get<string>('JWT_EXPIRES_IN') ?? '15m') as unknown as number
    const refreshExpiresIn = (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '30d') as unknown as number

    const basePayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId,
      tenantSlug,
    }
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { ...basePayload, type: 'access' },
        { secret: accessSecret, expiresIn: accessExpiresIn },
      ),
      this.jwt.signAsync(
        { ...basePayload, type: 'refresh' },
        { secret: refreshSecret, expiresIn: refreshExpiresIn },
      ),
    ])
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
      defaultTenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
    }
  }
}
