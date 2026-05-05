import { IsBoolean, IsEnum, IsHexColor, IsInt, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator'
import { AccountType } from '@prisma/client'

export class CreateAccountDto {
  @IsString()
  @MaxLength(60)
  name!: string

  @IsString()
  @MaxLength(10)
  currencyCode!: string

  @IsEnum(AccountType)
  @IsOptional()
  type?: AccountType

  @IsHexColor()
  @IsOptional()
  color?: string

  @IsString()
  @MaxLength(60)
  @IsOptional()
  iconKey?: string

  @IsNumber()
  @IsOptional()
  initialBalance?: number

  @IsString()
  @MaxLength(255)
  @IsOptional()
  cryptoAddress?: string

  @IsBoolean()
  @IsOptional()
  excludeFromTotals?: boolean

  @IsInt()
  @IsOptional()
  position?: number
}
