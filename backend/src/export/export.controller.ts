import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common'
import type { Response } from 'express'
import { Tenant } from '@/tenant/tenant.decorator'
import { WalletCsvExporter } from './wallet-csv.exporter'
import { WalletXlsExporter } from './wallet-xls.exporter'

@Controller('export')
export class ExportController {
  constructor(
    private readonly csv: WalletCsvExporter,
    private readonly xls: WalletXlsExporter,
  ) {}

  @Get('wallet-csv')
  async walletCsv(
    @Tenant() tenantId: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const { fromDate, toDate } = parseRange(from, to)
    const { content, rowCount } = await this.csv.exportTenant(tenantId, { from: fromDate, to: toDate })
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="wallet-export-${stamp}.csv"`)
    res.setHeader('X-Row-Count', String(rowCount))
    res.send(content)
  }

  @Get('wallet-xls')
  async walletXls(
    @Tenant() tenantId: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const { fromDate, toDate } = parseRange(from, to)
    const { buffer, rowCount } = await this.xls.exportTenant(tenantId, { from: fromDate, to: toDate })
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
    res.setHeader('Content-Type', 'application/vnd.ms-excel')
    res.setHeader('Content-Disposition', `attachment; filename="wallet-export-${stamp}.xls"`)
    res.setHeader('X-Row-Count', String(rowCount))
    res.send(buffer)
  }
}

function parseRange(from?: string, to?: string): { fromDate?: Date; toDate?: Date } {
  const fromDate = from ? new Date(from) : undefined
  const toDate = to ? new Date(to) : undefined
  if (fromDate && isNaN(fromDate.getTime())) throw new BadRequestException('from inválida')
  if (toDate && isNaN(toDate.getTime())) throw new BadRequestException('to inválida')
  return { fromDate, toDate }
}
