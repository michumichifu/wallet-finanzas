import { PartialType } from '@nestjs/mapped-types'
import { IsBoolean, IsOptional } from 'class-validator'
import { CreateAccountDto } from './create-account.dto'

export class UpdateAccountDto extends PartialType(CreateAccountDto) {
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean
}
