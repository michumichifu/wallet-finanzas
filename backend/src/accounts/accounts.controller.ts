import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'
import { Tenant } from '@/tenant/tenant.decorator'
import { AccountsService } from './accounts.service'
import { CreateAccountDto } from './dto/create-account.dto'
import { UpdateAccountDto } from './dto/update-account.dto'

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list(@Tenant() tenantId: string, @Query('includeArchived') includeArchived?: string) {
    return this.accounts.listForTenant(tenantId, { includeArchived: includeArchived === 'true' })
  }

  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateAccountDto) {
    return this.accounts.create(tenantId, dto)
  }

  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accounts.update(tenantId, id, dto)
  }

  @Patch(':id/fix-currency')
  fixCurrency(
    @Tenant() tenantId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('currencyCode') currencyCode: string,
  ) {
    return this.accounts.fixCurrency(tenantId, id, currencyCode)
  }

  @Delete(':id')
  archive(@Tenant() tenantId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.accounts.archive(tenantId, id)
  }
}
