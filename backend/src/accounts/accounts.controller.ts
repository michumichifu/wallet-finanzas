import { Controller, Get, Query } from '@nestjs/common'
import { Tenant } from '@/tenant/tenant.decorator'
import { AccountsService } from './accounts.service'

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list(
    @Tenant() tenantId: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.accounts.listForTenant(tenantId, {
      includeArchived: includeArchived === 'true',
    })
  }
}
