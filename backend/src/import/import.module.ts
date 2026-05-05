import { Module } from '@nestjs/common'
import { CatalogModule } from '@/catalog/catalog.module'
import { WalletCsvImportService } from './wallet-csv.service'

@Module({
  imports: [CatalogModule],
  providers: [WalletCsvImportService],
  exports: [WalletCsvImportService],
})
export class ImportModule {}
