import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'
import { RecordType } from '@prisma/client'
import { Tenant } from '@/tenant/tenant.decorator'
import { RecordsService } from './records.service'
import { CreateRecordDto } from './dto/create-record.dto'
import { UpdateRecordDto } from './dto/update-record.dto'
import { CreateTransferDto } from './dto/create-transfer.dto'

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

  @Get(':id')
  getOne(@Tenant() tenantId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.records.getOne(tenantId, id)
  }

  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateRecordDto) {
    return this.records.create(tenantId, dto)
  }

  @Post('transfer')
  createTransfer(@Tenant() tenantId: string, @Body() dto: CreateTransferDto) {
    return this.records.createTransfer(tenantId, dto)
  }

  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRecordDto,
  ) {
    return this.records.update(tenantId, id, dto)
  }

  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.records.remove(tenantId, id)
  }
}
