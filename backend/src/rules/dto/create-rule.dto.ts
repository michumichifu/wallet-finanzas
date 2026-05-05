import { IsBoolean, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator'
import type { RuleAction, RuleCondition } from './rule-condition'

export class CreateRuleDto {
  @IsString()
  @MaxLength(80)
  name!: string

  @IsObject()
  @IsNotEmpty()
  condition!: RuleCondition

  @IsObject()
  @IsNotEmpty()
  action!: RuleAction

  @IsUUID()
  @IsOptional()
  categoryId?: string

  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number
}
