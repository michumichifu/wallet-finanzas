import { Module } from '@nestjs/common'
import { WalletCsvExporter } from './wallet-csv.exporter'
import { ExportController } from './export.controller'

@Module({
  controllers: [ExportController],
  providers: [WalletCsvExporter],
  exports: [WalletCsvExporter],
})
export class ExportModule {}
