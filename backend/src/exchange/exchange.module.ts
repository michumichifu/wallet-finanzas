import { Global, Module } from '@nestjs/common'
import { ExchangeService } from './exchange.service'

@Global()
@Module({
  providers: [ExchangeService],
  exports: [ExchangeService],
})
export class ExchangeModule {}
