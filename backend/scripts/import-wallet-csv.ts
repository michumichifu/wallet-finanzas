/* eslint-disable no-console */
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import * as bcrypt from 'bcrypt'
import { AppModule } from '@/app.module'
import { PrismaService } from '@/prisma/prisma.service'
import { WalletCsvImportService } from '@/import/wallet-csv.service'
import { CatalogService } from '@/catalog/catalog.service'

/**
 * Script standalone para importar el CSV de Wallet by BudgetBakers.
 *
 * Uso:
 *   npm run import:wallet -- <path/al/archivo.csv> [--tenant=<slug>] [--email=<correo>]
 *
 * Si no existe el tenant lo crea con un usuario propietario por defecto. Es
 * idempotente: re-correrlo sobre el mismo archivo no duplica records (cada
 * record nuevo lleva `importBatchId`, distinto cada corrida; en futuro se
 * agregará deduplicación por hash de fila).
 */

interface CliArgs {
  csvPath: string
  tenantSlug: string
  email: string
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error('Uso: npm run import:wallet -- <ruta.csv> [--tenant=slug] [--email=correo]')
    process.exit(1)
  }
  const csvPath = args[0]!
  const get = (flag: string): string | undefined =>
    args.find((a) => a.startsWith(`--${flag}=`))?.split('=')[1]
  return {
    csvPath: resolve(csvPath),
    tenantSlug: get('tenant') ?? 'luis',
    email: get('email') ?? 'luisitoys@gmail.com',
  }
}

async function ensureUserAndTenant(prisma: PrismaService, catalog: CatalogService, slug: string, email: string) {
  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    const passwordHash = await bcrypt.hash('change-me-on-first-login', 10)
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: 'Luis Duran',
        role: 'SUPERADMIN',
      },
    })
    console.log(`User creado: ${user.email}`)
  }

  let tenant = await prisma.tenant.findUnique({ where: { slug } })
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        slug,
        name: 'Luis (personal)',
        ownerId: user.id,
        timezone: 'America/Caracas',
        refCurrencyCode: 'USD',
      },
    })
    await prisma.tenantMembership.create({
      data: { userId: user.id, tenantId: tenant.id, role: 'TENANT_OWNER' },
    })
    console.log(`Tenant creado: ${tenant.slug}`)
  }

  // Asegura monedas + categorías base para el tenant.
  await catalog.seedCurrencies()
  await catalog.seedWalletCategoriesForTenant(tenant.id)

  return { user, tenant }
}

async function main() {
  const cli = parseArgs()
  if (!existsSync(cli.csvPath)) {
    console.error(`No existe el archivo: ${cli.csvPath}`)
    process.exit(1)
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  })

  try {
    const prisma = app.get(PrismaService)
    const importer = app.get(WalletCsvImportService)
    const catalog = app.get(CatalogService)

    const { tenant } = await ensureUserAndTenant(prisma, catalog, cli.tenantSlug, cli.email)
    const csvContent = readFileSync(cli.csvPath)
    const fileName = cli.csvPath.split('/').pop()

    console.log(`Importando ${fileName} al tenant "${tenant.slug}"...`)
    const t0 = Date.now()
    const { batchId, report } = await importer.import({
      tenantId: tenant.id,
      csvContent,
      fileName,
    })
    const ms = Date.now() - t0
    console.log('---')
    console.log(`Batch: ${batchId}`)
    console.log(`Total filas: ${report.totalRows}`)
    console.log(`Importadas: ${report.imported}`)
    console.log(`Skipeadas:  ${report.skipped}`)
    console.log(`Tasas inferidas: ${report.inferredRates}`)
    console.log(`Cuentas creadas: ${report.accountsCreated.length === 0 ? '(ninguna)' : report.accountsCreated.join(', ')}`)
    if (report.errors.length > 0) {
      console.log(`Errores (primeros 10):`)
      for (const e of report.errors.slice(0, 10)) {
        console.log(`  fila ${e.sourceRow}: ${e.message}`)
      }
    }
    console.log(`Tiempo: ${(ms / 1000).toFixed(2)}s`)
  } finally {
    await app.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
