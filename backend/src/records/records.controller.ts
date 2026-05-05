import { Controller, Get, Query } from '@nestjs/common'
import { RecordType } from '@prisma/client'
import { Tenant } from '@/tenant/tenant.decorator'
import { RecordsService } from './records.service'

@Controller('records')
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  @Get()
  list(
    @Tenant() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('accountId') accountId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const validTypes: RecordType[] = ['EXPENSE', 'INCOME', 'TRANSFER']
    const typeEnum = validTypes.includes(type as RecordType) ? (type as RecordType) : undefined
    return this.records.list(tenantId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      accountId,
      categoryId,
      type: typeEnum,
      search,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
  }
}
