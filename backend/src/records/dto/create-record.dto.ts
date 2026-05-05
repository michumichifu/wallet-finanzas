import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'
import { PaymentType, RecordType } from '@prisma/client'

export class CreateRecordDto {
  @IsEnum(RecordType)
  type!: RecordType

  @IsUUID()
  accountId!: string

  @IsUUID()
  @IsOptional()
  categoryId?: string

  /** Monto en moneda de la cuenta. Negativo para EXPENSE, positivo para INCOME. */
  @IsNumber()
  amount!: number

  @IsString()
  @MaxLength(10)
  currencyCode!: string

  @IsEnum(PaymentType)
  @IsOptional()
  paymentType?: PaymentType

  @IsString()
  @MaxLength(60)
  @IsOptional()
  paymentTypeLabel?: string

  @IsString()
  @MaxLength(120)
  @IsOptional()
  payee?: string

  @IsString()
  @MaxLength(500)
  @IsOptional()
  note?: string

  @IsDateString()
  occurredAt!: string

  @IsBoolean()
  @IsOptional()
  isDraft?: boolean
}
