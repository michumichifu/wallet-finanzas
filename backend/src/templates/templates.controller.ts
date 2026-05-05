import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common'
import { Tenant } from '@/tenant/tenant.decorator'
import { TemplatesService } from './templates.service'
import { CreateTemplateDto } from './dto/create-template.dto'

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  list(@Tenant() tenantId: string) {
    return this.templates.list(tenantId)
  }

  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateTemplateDto) {
    return this.templates.create(tenantId, dto)
  }

  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.templates.remove(tenantId, id)
  }

  @Post(':id/apply')
  apply(@Tenant() tenantId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.templates.apply(tenantId, id)
  }
}
