import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common'
import { Tenant } from '@/tenant/tenant.decorator'
import { CategoriesService } from './categories.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get('tree')
  tree(@Tenant() tenantId: string) {
    return this.categories.treeForTenant(tenantId)
  }

  @Get()
  list(@Tenant() tenantId: string) {
    return this.categories.listForTenant(tenantId)
  }

  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateCategoryDto) {
    return this.categories.create(tenantId, dto)
  }

  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categories.update(tenantId, id, dto)
  }

  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.categories.remove(tenantId, id)
  }
}
