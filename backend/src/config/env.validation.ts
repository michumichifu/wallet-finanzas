import { plainToInstance } from 'class-transformer'
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, MinLength, validateSync } from 'class-validator'

export enum AppEnv {
  development = 'development',
  test = 'test',
  production = 'production',
}

export class EnvSchema {
  @IsEnum(AppEnv)
  NODE_ENV: AppEnv = AppEnv.development

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string

  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  JWT_SECRET!: string

  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  JWT_REFRESH_SECRET!: string

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN?: string

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN?: string

  /** 64 hex chars = 32 bytes for AES-256-GCM. */
  @IsString()
  @IsNotEmpty()
  @MinLength(64)
  MASTER_KEY!: string

  @IsUrl({ require_tld: false })
  @IsOptional()
  APP_BASE_URL?: string

  @IsString()
  @IsOptional()
  APP_PORT?: string

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string

  @IsString()
  @IsOptional()
  REDIS_URL?: string
}

export function validateEnv(raw: Record<string, unknown>): EnvSchema {
  const parsed = plainToInstance(EnvSchema, raw, { enableImplicitConversion: true })
  const errors = validateSync(parsed, { skipMissingProperties: false })
  if (errors.length > 0) {
    throw new Error(`Env validation failed:\n${errors.map((e) => e.toString()).join('\n')}`)
  }
  return parsed
}
