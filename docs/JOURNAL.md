# Journal

Bitácora de decisiones y avance por sesión. Una entrada por sesión de trabajo.

---

## 2026-05-04 — Sesión 0: génesis del proyecto

**Decisión raíz**: replicar Wallet by BudgetBakers en webapp propia (camino B). Motivación: Wallet no soporta fotos de facturas, su Analítica está rota para gastos VEF (usa tasa BCV), no permite IA.

**Arquitectura confirmada**:
- Stack: NestJS + Prisma + Postgres backend, React + Vite + TS + Tailwind + Zustand frontend.
- Multi-tenant por auth (JWT con `tenantId`), URL única limpia.
- Deploy-agnóstico: env vars controlan base URL, sin hardcoded.
- Path aliases internos `@/...` en TypeScript.
- Cripto como cuenta normal con `currency_code`.
- BYOK para IA (cada tenant agrega su API key, encriptada AES-256-GCM).
- Compatibilidad CSV/XLS round-trip con Wallet original.

**Aclaratoria importante**: NO usaremos la REST API de Wallet by BudgetBakers. Solo importamos su CSV exportado. La app tiene su propia API REST desde cero.

**Hosting**: VPS 1 con `wallet.creceideas.com`.

**GitHub**: público (cuando esté presentable, fase 1+). Conventional commits + semver.

**Iniciado en esta sesión**:
- Estructura de monorepo `/home/lu/wallet-finanzas/`
- README, CLAUDE.md, .gitignore, ROADMAP.md, este JOURNAL.md
- (Pendiente en próxima sesión: scaffolding backend NestJS, frontend Vite, Prisma schema, docker-compose)

**Próximo paso**: scaffolding NestJS backend con `nest new --package-manager npm`, Prisma init, env baseline.

**Decisiones tomadas en sesión 0 (siguiente bloque)**:
- GitHub user: `michumichifu`. Repo público día 1.
- Licencia: AGPL-3.0 (la más protectora públicamente).
- Identidad git local del repo: `michumichifu` + `luisitoys@gmail.com`. Sin GPG sign.
- Dev local SIN Docker (usuario decide instalar Postgres + Redis nativos cuando llegue fase 1). Docker solo en VPS.
- Estética target: financial cripto wall street — moderno, limpio, confianza. Modo dark y light. Referencias: Mercury, Linear, TradingView, Coinbase Pro, Phantom.

**Avance fase 0 — segundo bloque**:
- LICENSE AGPL-3.0 oficial añadida.
- Repo GitHub creado: https://github.com/michumichifu/wallet-finanzas (público).
- Primer push a `origin/main` exitoso.
- Backend NestJS scaffolded con TS strict, ESLint, Prettier, Jest.
- Backend path alias `@/*` agregado a `tsconfig.json`.
- Backend deps base instaladas: `@nestjs/config`, `@prisma/client`, `class-validator`, `class-transformer`, `prisma` (-D).
- Prisma init ejecutado: `prisma/schema.prisma` y `prisma.config.ts` generados. Provider postgresql.
- `.env.example` creado con todas las env vars que usaremos: APP_*, DATABASE_URL, JWT_*, MASTER_KEY, S3_*, REDIS_URL, COINGECKO_*, BINANCE_*. `.env` real omitido (.gitignore).
- Frontend Vite + React + TS scaffolded.
- Frontend path alias `@/*` agregado a `tsconfig.app.json` y `vite.config.ts`.
- Frontend `vite.config.ts` ahora respeta `VITE_BASE_PATH` y `VITE_DEV_PORT` env vars (deploy-agnóstico).
- Frontend deps base: Tailwind 4 (`tailwindcss`, `@tailwindcss/vite`), `lucide-react`, `react-router-dom`, `clsx`, `tailwind-merge`.
- Frontend `index.css` con Tailwind 4 + `@theme` tokens en oklch + variant `.dark`.
- Frontend boilerplate Vite eliminado (App.css, assets/, vite.svg). App.tsx mínimo con icono lucide y mensaje de pre-alfa.
- Frontend `index.html` actualizado: lang="es", title, theme-color, description.
- `docs/DESIGN_SYSTEM.md` creado con principios, paleta, referencias estéticas (Mercury/Linear/TradingView/Coinbase/Phantom), componentes mínimos planeados.

**Próximo paso (sesión 1)**: schema Prisma reflejando modelo de Wallet + extensiones, importador del CSV de 2,217 records, instalación Postgres nativo en Fedora.

---

## 2026-05-04 — Sesión 1: schema completo + importer

**Descubrimiento**: el usuario YA tiene Postgres y Valkey corriendo nativamente en Fedora. Panel Ads vive con `panel:panel@localhost:5432/panel_dev`. Para este proyecto seguimos el mismo patrón: `wallet:wallet@localhost:5432/wallet_finanzas`. Sin Docker en dev (solo prod). Pendiente que el usuario corra el comando único de creación de user/db.

**Decisión técnica**: Prisma 6 (igual que Panel Ads), no Prisma 7. Prisma 7 introdujo breaking changes en datasource (url movido a config externo) que rompen el patrón estándar y obligan a setup de adapters. Downgrade a 6 mantiene consistencia con Panel Ads y elimina fricción.

**Schema Prisma completo (`backend/prisma/schema.prisma`)**:
- Auth/tenancy: `User`, `Tenant`, `TenantMembership`, `ApiKey`, `AiCredential` (BYOK encriptado AES-256-GCM).
- Catálogos globales: `Currency` (con kind FIAT/CRYPTO), `ExchangeRate` (snapshots con `source` enum).
- Cuentas/categorías/labels: `Account`, `Category` (jerárquica), `Label`, `RecordLabel`.
- Transacciones: `Record`, `TransferPair` (vincula los 2 lados de una transferencia + tasa P2P aplicada).
- Recibos: `Receipt`, `ReceiptPhoto` (multi-foto por ticket largo).
- Automatización: `Template`, `AutomaticRule`, `Envelope` (presupuestos).
- Auditoría: `ImportBatch` con report JSON.
- 16 modelos, 11 enums, decimal(28,8) para amounts y decimal(28,12) para rates.

**Backend estructura agregada**:
- `src/prisma/` — `PrismaService` + `PrismaModule` global.
- `src/config/env.validation.ts` — `EnvSchema` con class-validator (DATABASE_URL, JWT_SECRET, MASTER_KEY 64 hex chars, etc.)
- `src/catalog/currencies.seed.ts` — 17 monedas iniciales (fiat regional + cripto principales).
- `src/catalog/wallet-categories.seed.ts` — árbol completo de categorías de Wallet con `walletEnvelopeId` para match exacto del CSV (envelope_id 1000 = Comestibles, 1001 = Restaurante, 4004 = Transporte, etc.).
- `src/catalog/catalog.service.ts` — `seedCurrencies()` + `seedWalletCategoriesForTenant()` idempotentes.
- `src/import/wallet-csv.parser.ts` — parser puro del CSV (sin DB) con validación de columnas requeridas.
- `src/import/wallet-csv.service.ts` — importer transaccional: detecta cuentas únicas, crea categorías, agrupa transferencias por timestamp, infiere tasas P2P de transferencias multi-moneda, persiste records con `importBatchId` para auditoría. Reporte estructurado por filas.
- `scripts/import-wallet-csv.ts` — script CLI standalone que bootstrappea NestJS context y ejecuta el import.

**npm scripts agregados**: `prisma:generate`, `prisma:migrate`, `prisma:studio`, `import:wallet`.

**Deps backend nuevas**: `csv-parse`, `dayjs`, `bcrypt` + `@types/bcrypt`, `tsx`, `tsconfig-paths`, `dotenv`.

**Verificaciones**:
- `npx prisma validate` OK.
- `npx prisma generate` OK (cliente generado en `node_modules/@prisma/client`).
- `npx tsc --noEmit` sin errores.
- `npm run build` (NestJS) OK, dist/ generado.

**Pendiente del usuario** (bloqueante para correr fase 1 end-to-end):
```bash
sudo -u postgres psql -c "CREATE USER wallet WITH PASSWORD 'wallet' CREATEDB;" -c "CREATE DATABASE wallet_finanzas OWNER wallet;"
```

Después:
```bash
cd /home/lu/wallet-finanzas/backend
cp .env.example .env
# Editar .env con MASTER_KEY (openssl rand -hex 32) y JWT_SECRET (>=32 chars)
npx prisma migrate dev --name init
npm run import:wallet -- /home/lu/Downloads/report_2026-05-04_115314.csv
```

Esto dejará 2,217 records importados, ~14 cuentas creadas, ~155 tasas P2P inferidas, listo para construir las vistas de lectura en sesión 2.

**Próximo paso (sesión 2)**: correr migración + import efectivo, construir endpoints `GET /api/accounts`, `/api/categories`, `/api/records` (sin auth todavía, hardcoded a tenant default), iniciar layout shell del frontend con sidebar + dashboard placeholder usando los tokens de design system.
