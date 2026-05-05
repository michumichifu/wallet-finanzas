import { BadRequestException, Controller, Get, Query } from '@nestjs/common'
import { Tenant } from '@/tenant/tenant.decorator'
import { DashboardService } from './dashboard.service'

function parseDate(name: string, raw: string | undefined): Date {
  if (!raw) throw new BadRequestException(`Falta query param ${name}`)
  const d = new Date(raw)
  if (isNaN(d.getTime())) throw new BadRequestException(`${name} no es una fecha válida: ${raw}`)
  return d
}

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary(
    @Tenant() tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.dashboard.summary(tenantId, parseDate('from', from), parseDate('to', to))
  }

  @Get('by-category')
  byCategory(
    @Tenant() tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('type') type?: 'EXPENSE' | 'INCOME',
  ) {
    return this.dashboard.categoryBreakdown(
      tenantId,
      parseDate('from', from),
      parseDate('to', to),
      type === 'INCOME' ? 'INCOME' : 'EXPENSE',
    )
  }
}
