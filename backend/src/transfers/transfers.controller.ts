import { Controller, Get, Query } from '@nestjs/common'
import { Tenant } from '@/tenant/tenant.decorator'
import { TransfersService } from './transfers.service'

@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfers: TransfersService) {}

  @Get()
  list(
    @Tenant() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.transfers.list(tenantId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
  }
}
