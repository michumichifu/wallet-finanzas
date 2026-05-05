import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import * as bcrypt from 'bcrypt'
import { AppModule } from '@/app.module'
import { PrismaService } from '@/prisma/prisma.service'

async function main() {
  const email = process.argv[2]
  const newPassword = process.argv[3]
  if (!email || !newPassword) {
    console.error('Uso: tsx reset.ts <email> <nueva-password>')
    process.exit(1)
  }
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] })
  const prisma = app.get(PrismaService)
  const hash = await bcrypt.hash(newPassword, 10)
  const user = await prisma.user.update({ where: { email: email.toLowerCase() }, data: { passwordHash: hash } })
  console.log(`Password reseteada para ${user.email}`)
  await app.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
