import { Module } from '@nestjs/common'
import { WalletCsvExporter } from './wallet-csv.exporter'
import { WalletXlsExporter } from './wallet-xls.exporter'
import { ExportController } from './export.controller'

@Module({
  controllers: [ExportController],
  providers: [WalletCsvExporter, WalletXlsExporter],
  exports: [WalletCsvExporter, WalletXlsExporter],
})
export class ExportModule {}
