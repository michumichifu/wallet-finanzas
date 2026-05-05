import { IsEnum, IsHexColor, IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'
import { CategoryKind } from '@prisma/client'

export class CreateCategoryDto {
  @IsString()
  @MaxLength(60)
  name!: string

  /** Si no se envía, se deriva del name. */
  @IsString()
  @MaxLength(80)
  @IsOptional()
  slug?: string

  @IsEnum(CategoryKind)
  @IsOptional()
  kind?: CategoryKind

  @IsUUID()
  @IsOptional()
  parentId?: string

  @IsHexColor()
  @IsOptional()
  color?: string

  @IsString()
  @MaxLength(60)
  @IsOptional()
  iconKey?: string

  @IsInt()
  @IsOptional()
  position?: number
}
