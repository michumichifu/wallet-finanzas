import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { Public } from '@/auth/public.decorator'

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: 'ok'; db: 'ok' | 'error'; uptime: number }> {
    let db: 'ok' | 'error' = 'error'
    try {
      await this.prisma.$queryRaw`SELECT 1`
      db = 'ok'
    } catch {
      db = 'error'
    }
    return { status: 'ok', db, uptime: process.uptime() }
  }
}
