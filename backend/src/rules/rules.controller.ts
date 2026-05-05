import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'
import { Tenant } from '@/tenant/tenant.decorator'
import { RulesService } from './rules.service'
import { CreateRuleDto } from './dto/create-rule.dto'
import { UpdateRuleDto } from './dto/update-rule.dto'

@Controller('rules')
export class RulesController {
  constructor(private readonly rules: RulesService) {}

  @Get()
  list(@Tenant() tenantId: string) {
    return this.rules.list(tenantId)
  }

  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateRuleDto) {
    return this.rules.create(tenantId, dto)
  }

  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRuleDto,
  ) {
    return this.rules.update(tenantId, id, dto)
  }

  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.rules.remove(tenantId, id)
  }

  @Post('apply-all')
  applyAll(@Tenant() tenantId: string, @Query('overwriteAll') overwriteAll?: string) {
    return this.rules.applyAll(tenantId, { overwriteAll: overwriteAll === 'true' })
  }
}
