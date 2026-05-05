import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { CatalogModule } from './catalog/catalog.module'
import { ImportModule } from './import/import.module'
import { ExchangeModule } from './exchange/exchange.module'
import { AccountsModule } from './accounts/accounts.module'
import { CategoriesModule } from './categories/categories.module'
import { RecordsModule } from './records/records.module'
import { DashboardModule } from './dashboard/dashboard.module'
import { TransfersModule } from './transfers/transfers.module'
import { TemplatesModule } from './templates/templates.module'
import { AuthModule } from './auth/auth.module'
import { JwtAuthGuard } from './auth/jwt-auth.guard'
import { HealthController } from './health/health.controller'
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
    AuthModule,
    AccountsModule,
    CategoriesModule,
    RecordsModule,
    TransfersModule,
    TemplatesModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [
    // Guard global: TODOS los endpoints requieren JWT salvo @Public().
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
