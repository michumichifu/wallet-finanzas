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

  @IsString()
  @MaxLength(80)
  @IsOptional()
  bankName?: string

  @IsHexColor()
  @IsOptional()
  color?: string

  @IsHexColor()
  @IsOptional()
  iconColor?: string

  @IsString()
  @MaxLength(60)
  @IsOptional()
  iconKey?: string

  /** Data URL o URL externa. Limitamos tamaño para evitar payloads gigantes. */
  @IsString()
  @MaxLength(500_000)
  @IsOptional()
  photoUrl?: string

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
