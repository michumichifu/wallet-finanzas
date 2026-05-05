import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'

export class CreateTransferDto {
  @IsUUID()
  fromAccountId!: string

  @IsUUID()
  toAccountId!: string

  /** Monto positivo en la moneda de la cuenta origen. */
  @IsNumber()
  fromAmount!: number

  /** Monto positivo en la moneda de la cuenta destino. Si misma moneda, igual a fromAmount. */
  @IsNumber()
  toAmount!: number

  @IsDateString()
  occurredAt!: string

  @IsString()
  @MaxLength(500)
  @IsOptional()
  note?: string
}
