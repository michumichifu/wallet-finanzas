import { Controller, Get } from '@nestjs/common'
import { Tenant } from '@/tenant/tenant.decorator'
import { CategoriesService } from './categories.service'

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
}
