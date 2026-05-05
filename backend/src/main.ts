import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { Logger, ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  })
  const logger = new Logger('Bootstrap')

  app.setGlobalPrefix('api')

  const corsRaw = process.env.CORS_ORIGINS ?? 'http://localhost:3000'
  const origins = corsRaw.split(',').map((s) => s.trim()).filter(Boolean)
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug'],
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  const port = Number(process.env.APP_PORT ?? 4000)
  await app.listen(port)
  logger.log(`API listening at http://localhost:${port}/api`)
}

void bootstrap()
