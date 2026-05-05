import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { CatalogModule } from './catalog/catalog.module'
import { ImportModule } from './import/import.module'
import { ExchangeModule } from './exchange/exchange.module'
import { AccountsModule } from './accounts/accounts.module'
import { CategoriesModule } from './categories/categories.module'
import { RecordsModule } from './records/records.module'
import { DashboardModule } from './dashboard/dashboard.module'
import { HealthController } from './health/health.controller'
import { TenantContextMiddleware } from './tenant/tenant-context.middleware'
import { validateEnv } from './config/env.validation'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: (raw) => validateEnv(raw as Record<string, unknown>),
    }),
    PrismaModule,
    ExchangeModule,
    CatalogModule,
    ImportModule,
    AccountsModule,
    CategoriesModule,
    RecordsModule,
    DashboardModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Aplica resolución de tenant a todas las rutas excepto /health.
    consumer
      .apply(TenantContextMiddleware)
      .exclude({ path: 'health', method: 0 /* RequestMethod.GET */ })
      .forRoutes('*path')
  }
}
