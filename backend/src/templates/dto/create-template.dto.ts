import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'
import { RecordType } from '@prisma/client'

/**
 * Una plantilla representa un gasto/ingreso recurrente. Al "aplicar" la plantilla
 * se crea un Record con la fecha actual usando los valores aquí guardados.
 */
export class CreateTemplateDto {
  @IsString()
  @MaxLength(60)
  name!: string

  @IsEnum(RecordType)
  type!: RecordType

  @IsUUID()
  accountId!: string

  @IsUUID()
  @IsOptional()
  categoryId?: string

  @IsNumber()
  amount!: number

  @IsString()
  @MaxLength(10)
  currencyCode!: string

  @IsString()
  @MaxLength(120)
  @IsOptional()
  payee?: string

  @IsString()
  @MaxLength(500)
  @IsOptional()
  note?: string
}
