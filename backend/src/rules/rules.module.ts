import { Global, Module } from '@nestjs/common'
import { RulesService } from './rules.service'
import { RulesController } from './rules.controller'

@Global()
@Module({
  controllers: [RulesController],
  providers: [RulesService],
  exports: [RulesService],
})
export class RulesModule {}
