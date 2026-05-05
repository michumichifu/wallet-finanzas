import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common'
import type { Response } from 'express'
import { Tenant } from '@/tenant/tenant.decorator'
import { WalletCsvExporter } from './wallet-csv.exporter'

@Controller('export')
export class ExportController {
  constructor(private readonly exporter: WalletCsvExporter) {}

  @Get('wallet-csv')
  async walletCsv(
    @Tenant() tenantId: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const fromDate = from ? new Date(from) : undefined
    const toDate = to ? new Date(to) : undefined
    if (fromDate && isNaN(fromDate.getTime())) throw new BadRequestException('from inválida')
    if (toDate && isNaN(toDate.getTime())) throw new BadRequestException('to inválida')

    const { content, rowCount } = await this.exporter.exportTenant(tenantId, {
      from: fromDate,
      to: toDate,
    })

    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
    const filename = `wallet-export-${stamp}.csv`

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('X-Row-Count', String(rowCount))
    res.send(content)
  }
}
