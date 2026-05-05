import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class RegisterDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  @MaxLength(120)
  password!: string

  @IsString()
  @MaxLength(80)
  @IsOptional()
  displayName?: string

  @IsString()
  @MaxLength(40)
  @IsOptional()
  /** Slug del tenant a crear. Si no se da, se deriva del email. */
  tenantSlug?: string
}
