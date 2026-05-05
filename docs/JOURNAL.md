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

---

## 2026-05-04 (continuación) — Sesión 1.5: end-to-end fase 1 ejecutado

**Setup Postgres**:
- DB `wallet_finanzas` y user `wallet:wallet` creados con `CREATEDB` privileges.
- Truco necesario: pg_hba.conf venía con `local all all md5` (sin peer auth para postgres user). Cambio temporal añadiendo `local all postgres peer` antes de la línea md5, reload, crear user/db, restaurar archivo original, reload de nuevo.
- Conexión validada: `PGPASSWORD=wallet psql -h localhost -U wallet -d wallet_finanzas` OK.

**Setup .env**:
- `MASTER_KEY`, `JWT_SECRET`, `JWT_REFRESH_SECRET` generados con `openssl rand -hex 32` (cada uno 64 chars hex = 32 bytes).
- DATABASE_URL apunta a localhost:5432.

**Migración Prisma**:
- `npx prisma migrate dev --name init` aplicó migración `20260505025213_init` y regeneró cliente.

**Bug grande resuelto**: tsx no respeta `emitDecoratorMetadata`, lo que causaba que NestJS DI inyectara `undefined` en lugar del PrismaService al construir CatalogService. Síntoma: `Cannot read properties of undefined (reading 'currency')` al llamar `this.prisma.currency.upsert`. La propiedad `prisma` existía pero su valor era undefined silenciosamente. Cambio a `ts-node --transpile-only -r tsconfig-paths/register` lo solucionó. Sin esto, NestJS se ve afuera de `nest start` queda inservible.

**Import del CSV ejecutado** (archivo `/home/lu/Downloads/report_2026-05-04_115314.csv`):

| Métrica | Valor |
|---|---|
| Filas en CSV | 2,216 |
| Records importados | 2,216 (0 errores) |
| Tiempo | 25 s |
| Cuentas creadas | 14 (BDV Bs, Mercantil Bs, USDT Binance, BDV USD, PayPal, Banco BHD pesos, EFECTIVO USD, Banco ACAP Pesos, Wally USD, Facebank PR, ApoloPay, Zinli, Efectivo, Efectivo COP) |
| Categorías sembradas | 88 |
| Monedas en catálogo | 17 |
| Transfer pairs | 288 (= 576 records de tipo TRANSFER) |
| Tasas P2P inferidas | 214 |
| Rango temporal | 2024-04-29 → 2026-04-30 |
| Distribución por tipo | 1362 EXPENSE / 278 INCOME / 576 TRANSFER |

**Anomalía menor pendiente**: la cuenta "Banco ACAP Pesos" se importó con `currencyCode=USD` cuando debería ser DOP. La primera fila vista para esa cuenta en el CSV tenía currency USD por error (posible registro inicial mal anotado). El usuario lo puede corregir desde la UI futura, o lo arreglamos con un fix script en sesión 2.

**Estado fase 1**: COMPLETADA end-to-end. La data del usuario está viva en Postgres listo para construir UI encima.

---

## 2026-05-04 — Sesión 2: API REST + dashboard frontend

**Backend — endpoints REST listos**:
- `GET /api/health` — status, DB ping, uptime.
- `GET /api/accounts` — 14 cuentas con `balance` nativo + `balanceUsd` (tasa P2P real).
- `GET /api/categories` y `/api/categories/tree` — flat + jerárquico.
- `GET /api/records?from=&to=&accountId=&categoryId=&type=&search=&page=&pageSize=` — paginado, max 200/página, ordenado por `occurredAt desc`.
- `GET /api/dashboard/summary?from=&to=` — totales del periodo + comparación con periodo anterior de igual duración.
- `GET /api/dashboard/by-category?from=&to=&type=` — breakdown por categoría con `parentSlug` para agrupar.

**Tenant context (pre-auth)**: `TenantContextMiddleware` lee header `X-Tenant-Slug`, default `luis`. Se inyecta `request.tenantId` con un cache por slug. Cuando llegue auth (fase 2 final), se reemplaza por un guard JWT sin cambiar los controllers (siguen usando `@Tenant() tenantId: string`).

**Conversión a USD — `ExchangeService`**: política por moneda:
1. USD/USDT/USDC → 1:1 (stable).
2. VEF/VES → busca tasa con preferencia `BINANCE_P2P > INFERRED_FROM_TRANSFER > MANUAL > BCV`. Si no hay, `null` (no inventa).
3. Otras → snapshot directo o inverso más cercano en tiempo.
4. Fallback fijo conservador (DOP=60, COP=4000, etc.) si no hay snapshot.

**Sample comparison** (abril 2026):
- Wallet oficial (BCV-based): "$3.52 DOP" ≈ $0.06 USD → falso.
- Nuestra app (P2P real): $607.53 gastos, $404.25 ingresos, neto -$203.28. Real.

**Frontend — primer dashboard funcional**:
- API client tipado (`src/lib/api.ts`) con axios + `X-Tenant-Slug` por defecto.
- Theme store (Zustand persistido) con toggle dark/light + `bootstrapTheme()` para evitar flash inicial.
- AppShell con sidebar (lucide-react icons, NavLink activo) + header con ThemeToggle, responsive.
- DashboardPage:
  - Periodo: mes actual (`Intl.toLocaleDateString` para el label).
  - 4 KPIs: Ingreso, Gasto, Flujo neto, # Transacciones, con delta % vs mes anterior.
  - Card de Cuentas con saldos por cuenta (icono según tipo CRYPTO/CASH/GENERAL) + total agregado en USD.
  - Card "Por categoría" con bar-charts inline (top 8 gastos del mes).
  - Skeletons en estados de carga.
- React Query con `staleTime: 30s`, sin refetch on focus.
- Tailwind 4 tokens del design system funcionando: `bg-bg`, `text-fg`, `bg-bg-subtle`, `bg-bg-muted`, `text-positive`, `text-negative`, `ring-border`, etc.
- `font-variant-numeric: tabular-nums` aplicado a todos los montos via clase `tabular`.

**Routing**:
- `/` Dashboard
- `/cuentas`, `/registros`, `/transferencias`, `/categorias`, `/ajustes` — placeholders con icono y mensaje (se construyen en sesiones 3+).
- `BrowserRouter basename={import.meta.env.BASE_URL}` para deploy-agnóstico.

**Issues menores resueltos**:
- TypeScript 5 deprecation warning sobre `baseUrl` en tsconfig → agregado `"ignoreDeprecations": "6.0"`.
- Sidebar `as const` causaba TS2339 al acceder `end` → convertido a `NavItem[]` con `end?: boolean` opcional.
- CORS_ORIGINS extendido a `http://localhost:3000,http://localhost:3001` porque Panel Ads ya ocupa 3000 (Vite usa 3001).

**Pendiente menor para sesión 3**:
- Cuenta `Banco ACAP Pesos` quedó con `currencyCode=USD` por error en CSV original → sale con balance $423 cuando debería ser ~$2.37 (142 DOP / 60). Fix script o corrección desde UI cuando exista CRUD.

**Próximo paso (sesión 3)**: páginas completas — Records con filtros y paginación, Cuentas con detalle y CRUD, Transferencias dedicada, formulario de registro nuevo. Después auth real.

---

## 2026-05-05 — Sesión 3: CRUD + páginas Records/Accounts

**Backend — endpoints CRUD añadidos**:
- `POST /api/records` — crear gasto/ingreso. Validación de tenant ownership de cuenta y categoría. Forzado de signo (EXPENSE→negativo, INCOME→positivo). Bloquea TRANSFER aquí.
- `POST /api/records/transfer` — crear transferencia. Crea TransferPair + dos records vinculados. Calcula `appliedRate` desde `toAmount/fromAmount`.
- `PATCH /api/records/:id` — editar record. Bloquea editar transferencias (recomienda borrar y recrear).
- `DELETE /api/records/:id` — borrar. Si es leg de transferencia, borra el par completo + el TransferPair en una transacción.
- `POST /api/accounts` — crear cuenta. Valida currency en catálogo, unique por (tenant, name).
- `PATCH /api/accounts/:id` — editar (nombre, type, color, etc.).
- `PATCH /api/accounts/:id/fix-currency` — endpoint especial: cambia moneda de cuenta + propaga el cambio a TODOS los records existentes en una transacción. Usado para arreglar imports erróneos.
- `DELETE /api/accounts/:id` — soft delete (archiva).

**Bug ACAP arreglado en producción de tu DB**: `Banco ACAP Pesos` pasó de USD a DOP. 14 records actualizados. Saldo ahora muestra correcto: 423.15 DOP = $6.66 USD (antes mostraba absurdamente $423 USD).

**DTOs con class-validator**:
- CreateRecordDto: amount obligatorio, currencyCode con MaxLength, occurredAt como ISO string, note y payee opcionales con MaxLength.
- CreateTransferDto: fromAmount/toAmount positivos, fromAccountId ≠ toAccountId.
- CreateAccountDto / UpdateAccountDto con `@nestjs/mapped-types::PartialType`.

**Frontend — componentes UI nuevos**:
- `Button` (primary/secondary/ghost/destructive, sm/md/lg) con focus rings y disabled.
- `Input` / `Textarea` / `Select` / `FieldLabel` con tabular-nums donde aplica.
- `Drawer` lateral con escape-to-close + click outside + scroll-lock body.
- `RecordTypeBadge` con icono + color coherente (positive/negative/neutral).

**Frontend — páginas funcionales**:
- **Página Registros** (`/registros`):
  - Tabla con columnas Fecha, Tipo, Cuenta, Categoría, Nota, Monto nativo, USD equivalente, acciones.
  - Filtros: search por nota/payee, type (gasto/ingreso/transferencia), cuenta.
  - Paginación 50/página, controles previous/next, contador "mostrando X-Y de Z".
  - Skeletons en loading. Vacío state con mensaje.
  - Botón delete por fila con confirm. Para transferencias borra el par.
- **Página Cuentas** (`/cuentas`):
  - Lista con icono según tipo (CRYPTO/CASH/GENERAL), saldo nativo + USD.
  - Botón "Nueva cuenta" → drawer.
  - Click en lápiz → drawer de edición con campo especial "fix-currency" cuando cambias moneda (checkbox que decide si propagar a registros existentes).
  - Total en USD calculado client-side (excluye archivadas y excludeFromTotals).

**Frontend — botón global "Nuevo registro"**:
- En el header del AppShell (siempre visible).
- Abre `NewRecordDrawer` con segmented control 3-estados (Gasto / Ingreso / Transferencia).
- Cuenta + categoría según tipo. Para transferencias: dos cuentas + monto destino independiente si las monedas difieren (input adicional aparece automáticamente).
- Validación client-side (cuenta requerida, monto > 0, origen ≠ destino).
- Invalida queries relevantes al guardar (records, accounts, dashboard-summary, dashboard-by-category).
- Manejo de errores del backend (extrae `response.data.message`, soporta string o array).

**Smoke test end-to-end ejecutado**:
- POST gasto VEF -1500 → OK (signo aplicado automático).
- DELETE single → OK.
- POST transferencia USDT 50 → 31579 Bs → OK (transferPairId retornado).
- DELETE transferencia → borra par completo (deleted: 2).

**Pendiente sesión 4**:
- Página Categorías con CRUD + reordenamiento.
- Página Transferencias dedicada (filtra el árbol de records con isTransfer=true y agrupa por par).
- Edit drawer del Record (no solo create) — actualmente borrar+crear es el workflow.
- Auth real (JWT) — ya están las tablas User, Tenant, TenantMembership listas.
- Login UI + register UI + super admin panel.
- Categorías favoritas / templates rápidos para el flow de "anotar gasto en 3 segundos".

---

## 2026-05-05 — Sesión 4: Auth real JWT + Edit drawer

**Backend — auth completo**:
- Module `auth/` con `AuthService`, `AuthController`, `JwtStrategy`, `JwtAuthGuard`, `Public()` decorator.
- Endpoints:
  - `POST /api/auth/register` — crea User + Tenant (slug derivado del email) + Membership + siembra catálogos (currencies, categorías Wallet) + emite tokens.
  - `POST /api/auth/login` — valida bcrypt + emite tokens. Resuelve tenant default (owned para SUPERADMIN, primer membership para resto).
  - `POST /api/auth/refresh` — refresh con refreshToken (verifica `type === 'refresh'`).
  - `GET /api/auth/me` — user + tenant actual + lista de tenants accesibles.
- Tokens JWT: access 15m + refresh 30d, secrets distintos (`JWT_SECRET` y `JWT_REFRESH_SECRET`). Payload: sub, email, role, tenantId, tenantSlug, type.
- bcrypt hash 10 rounds para passwords.
- `JwtAuthGuard` registrado como `APP_GUARD` global → todos los endpoints requieren auth excepto los marcados `@Public()`.
- TenantContextMiddleware eliminado (ya no se necesita: el `tenantId` viaja en el JWT). El decorator `@Tenant()` ahora lee primero de `request.user.tenantId`.
- `HealthController` marcado `@Public()`.

**Frontend — auth flow**:
- `auth.store.ts` (Zustand persist en `wallet:auth`) con accessToken, refreshToken, user, tenant.
- `LoginPage` y `RegisterPage` con cards centradas, formato consistente con design system, errores extraídos del backend (string o array de class-validator).
- `ProtectedRoute` wrapper que redirecciona a `/login` con `state.from` para volver post-login.
- Axios interceptor:
  - Request: añade `Authorization: Bearer <accessToken>` automáticamente.
  - Response 401: dispara refresh con `refreshToken` y reintenta la request original. Si falla, `clear()` del store. Single-flight pattern (variable `refreshing` evita refreshes concurrentes).
- Sidebar muestra avatar (inicial del email), display name, role, botón logout.
- Login con cuenta demo: `luisitoys@gmail.com` / `change-me-on-first-login` (hash creado durante import del CSV en sesión 1.5).

**Frontend — RecordDrawer unificado**:
- `RecordDrawer` reemplaza `NewRecordDrawer`. Acepta `record?: RecordListItem | null`.
- Si `record` presente → modo edición: prefilla campos, oculta el segmented control de tipo (no se cambia tipo en edit), llama PATCH.
- Si `record === null` → modo creación con segmented Gasto/Ingreso/Transferencia.
- Botón Edit en cada fila de Records (oculto si `isTransfer` — backend no permite editar transfers, solo borrar y recrear).
- Al guardar invalida queries: records, accounts, dashboard-summary, dashboard-by-category.

**Endpoint smoke test**:
- `/api/health` público OK.
- `/api/accounts` sin Bearer → 401.
- `/api/auth/login` retorna tokens válidos.
- `/api/accounts` con Bearer → 14 cuentas correctamente.
- `/api/auth/me` retorna profile con tenant y memberships.

**Pendiente sesión 5**:
- Página Categorías con CRUD + reordenamiento (drag-and-drop opcional).
- Página Transferencias dedicada con vista de pares.
- Cambiar tenant activo (selector si user pertenece a múltiples).
- Templates / plantillas de gasto rápido (anotar en 3 segundos).
- Reglas automáticas (auto-categorizar por payee/note).
- Super admin panel (vista global de tenants, métricas).

---

## 2026-05-05 — Sesión 5: Categorías CRUD + Transferencias + Templates rápidos

**Backend — Categorías CRUD**:
- `POST /api/categories` — crea con slug auto-generado del nombre (NFD + lowercase + dash). Valida `parentId` ownership.
- `PATCH /api/categories/:id` — edita name, slug, kind, parentId (con validación de no auto-referencia), color, iconKey, position, isArchived. Bloquea cambios de slug/kind en categorías sistema.
- `DELETE /api/categories/:id` — soft delete inteligente: si tiene records vinculados o subcategorías, archiva. Sin uso → hard delete. Bloquea borrar categorías sistema.

**Backend — Transferencias dedicadas**:
- Nuevo módulo `transfers/` con `TransfersService` + `TransfersController`.
- `GET /api/transfers?from=&to=&page=&pageSize=` — devuelve TransferPairs paginados, no records sueltos. Cada item incluye:
  - `id`, `occurredAt`, `appliedRate` (la tasa P2P real usada), `rateSource` (BINANCE_P2P, INFERRED_FROM_TRANSFER, etc.), `notes`.
  - `from`: leg debit con cuenta, monto, monto USD.
  - `to`: leg credit con cuenta, monto, monto USD.
- Ordena por `occurredAt desc`. Sirve la vista de pares que en Records aparecía como filas duplicadas.

**Backend — Templates (gasto rápido)**:
- Nuevo módulo `templates/`.
- `POST /api/templates` — crea con payload JSON (type, accountId, categoryId, amount, currencyCode, payee, note).
- `GET /api/templates` — lista las del tenant (orden creación desc).
- `DELETE /api/templates/:id` — elimina.
- `POST /api/templates/:id/apply` — crea un Record nuevo desde la plantilla con `occurredAt = now`. Aplica forzado de signo automáticamente (EXPENSE→negativo, INCOME→positivo). Útil para gastos recurrentes (suscripciones, recargas, alquiler).

**Frontend — Página Categorías** (`/categorias`):
- Lista jerárquica padre → hijo (indentación visual).
- Badge tipo: Gasto/Ingreso/Ambos/Transferencia/Sistema con paleta semántica.
- Toggle "mostrar sistema" (por defecto oculta TRANSFER y demás).
- Botón crear/editar/borrar por fila. Categorías sistema bloqueadas.
- Drawer con form: nombre, kind, parent (selector con todas las raíces excepto sí misma).
- Eliminar muestra confirm + maneja la respuesta del backend (archived vs deleted).

**Frontend — Página Transferencias** (`/transferencias`):
- Vista por pares en cards: fecha + cuenta origen ↓ + cuenta destino ↑ + tasa aplicada + fuente de la tasa.
- Para tasas != 1, muestra "631.58 VEF/USD" + label de fuente ("P2P inferida", "P2P Binance", "manual", etc.).
- Botón borrar borra el par completo (deleteRecord en cualquier leg → backend borra ambas).
- Botón "Nueva" abre el RecordDrawer en modo TRANSFER directo.

**Frontend — Templates rápidos**:
- Botón "Plantillas" en header del shell (variant secondary).
- Drawer lista plantillas existentes con icono Zap y botón "Aplicar" en cada una. Click → POST apply → invalida queries → cierra.
- Drawer separado "Nueva plantilla" con form completo (name, type, account, amount, category, payee, note).
- Ideal para: pago Internet mensual, recarga celular, suscripciones, almuerzo del día.

**Smoke test ejecutado**:
- POST categoría "Cripto trading" → slug auto "cripto-trading". DELETE → hard delete (sin uso).
- POST template "Test almuerzo Bs" 2000 VEF → creado.
- POST `/templates/:id/apply` → record creado con amount=-2000 (signo aplicado), note copiada, occurredAt=now.
- DELETE template + DELETE record de prueba → OK.

---

## 2026-05-05 — Sesión 6: Export Wallet-compatible + DateRangePicker + Settings

**Backend — ExportModule**:
- `WalletCsvExporter`: produce CSV idéntico al export oficial de Wallet by BudgetBakers. BOM UTF-8, separador `;`, "Gastos"/"Ingresos" en español, transfer "true"/"false", envelope_id preservado de `Category.walletEnvelopeId`. Round-trip verificado contra el CSV original importado en sesión 1.5.
- `GET /api/export/wallet-csv?from=&to=` retorna `text/csv` attachment.
- Detalle TypeScript: `import type { Response } from 'express'` para satisfacer `isolatedModules` en NestJS 11.

**Frontend — DateRangePicker** (`components/DateRangePicker.tsx`):
- Presets: Este mes, Mes pasado, Últimos 3 meses, Últimos 6 meses, Este año, Año pasado, Todo el historial.
- Rango personalizado con dos inputs date.
- `computeRange(preset)` exportado para usar fuera del componente.
- Click outside + Escape close.

**Frontend — Dashboard y Records con date range**:
- Dashboard usa el picker (default "Este mes"). KPIs y breakdown re-fetchan al cambiar.
- Records usa el picker (default "Todo el historial" para ver toda la data).

**Frontend — Settings page** (`/ajustes`, reemplaza placeholder):
- Card "Cuenta" con name/email/role/tenant.
- Card "Exportar" con toggle de rango (Todo / Este año / Este mes) + botón "Descargar CSV".
- Triggers blob download via `Api.exportWalletCsv` que retorna el archivo como Blob.

**Tag**: `v0.6.0`.

**Pendiente sesión 7**:
- Reglas automáticas (auto-categorizar)
- Export XLS además del CSV
- Super admin panel
- Selector de tenant
- Multi-condition en reglas

---

## 2026-05-05 — Sesión 7: Reglas automáticas + export XLS

**Backend — RulesModule**:
- Nueva entidad `AutomaticRule` (ya en schema desde sesión 1) con CRUD.
- Predicate engine en `dto/rule-condition.ts`:
  - Operators: `contains`, `notContains`, `equals`, `startsWith`, `endsWith`, `gt`, `gte`, `lt`, `lte`.
  - Combinator AND/OR sobre N items.
  - Case-insensitive por default, configurable.
- Endpoints: GET/POST/PATCH/DELETE + `POST /apply-all?overwriteAll=true|false`.
- Política `apply-all`: por default solo categoriza records sin categoría; con `overwriteAll=true` re-clasifica todos.
- **Hook on-create**: `RecordsService.create` llama a `RulesService.evaluateForRecord` cuando el user no especificó categoría. La primera regla activa que matchea (orden por priority asc) gana.

**Backend — WalletXlsExporter**:
- `xlsx` library. Produce `.xls` con dos hojas: "Registros" (mismo schema que CSV) + "Deudas" (vacía con header válido — Wallet original tiene este sheet aunque casi nadie lo usa).
- Fechas serializadas como Excel serial number. Transfer flag como 0/1.
- `GET /api/export/wallet-xls` retorna `application/vnd.ms-excel`.

**Frontend — Página Reglas** (`/reglas`):
- Sidebar nueva entrada con icono `Sparkles` entre Categorías y Ajustes.
- Lista de reglas con toggle activar/desactivar (slider switch), badge de tipo, edit/delete.
- Drawer con form single-condition (field + operator + value + categoría destino). API soporta multi-condition AND/OR pero la UI por simplicidad solo expone una condición; iterar después.
- Botón "Aplicar a registros sin categoría" (seguro). Botón secundario "Sobreescribir categorías existentes" (peligroso, en card aparte).
- Resultado del apply muestra "Escaneados X registros · Y categorizados".

**Frontend — XLS button en Settings**:
- Junto al CSV, botón "XLS" descargando el `.xls`.
- Refactor de `rangeParams()` y `downloadBlob(blob, ext)` para reusar entre formatos.

**Smoke tests**:
- Crear regla "note contains cochino → Comestibles" + apply-all → OK.
- Export XLS detectado como CDFV2 (Microsoft Excel real) por `file`.

**Tag**: `v0.7.0`.

**Pendiente sesión 8**:
- UX de cuentas tipo Wallet (grid 5 col, iconos custom, foto upload, color)
- Detalle de cuenta con gráfica histórica
- Tipos de cuenta más granulares (cripto exchange/wallet, banco/neobanco, etc.)
- Bloquear cambio de moneda tras crear

---

## 2026-05-05 — Sesión 8: Account UX rico (grid + iconos + colores + fotos + detail page)

**Trigger**: usuario mostró screenshots de Wallet by BudgetBakers (dashboard con grid 5 columnas, modal de detalle con gráfica histórica, modal de edit con color/tipo/monto inicial/toggles). Pidió igualar y mejorar (foto upload + iconos custom de librería + más subtipos de cuenta).

**Schema migration `20260505155236_account_subtypes_and_visuals`**:
- AccountType enum extendido con: `CHECKING`, `DEBIT_CARD`, `CRYPTO_EXCHANGE`, `CRYPTO_WALLET`, `MORTGAGE`, `BOND`, `LIFE_INSURANCE`, `OVERDRAFT`. Mantiene los anteriores (`GENERAL`, `CASH`, `SAVINGS`, `CREDIT_CARD`, `INVESTMENT`, `CRYPTO`, `LOAN`, `OTHER`).
- Account: nuevos campos `bankName` (string, ej "BHD"/"Binance"/"Phantom"), `iconColor` (hex), `photoUrl` (data URL o URL externa).

**Backend**:
- `AccountsService.getOne(tenantId, id)`: devuelve cuenta completa con saldo y USD-equiv.
- `AccountsService.balanceHistory(tenantId, id, {from, to})`: genera 1 punto por día. Saldo acumulado parte de `initialBalance + records antes de from`, luego camina día a día sumando records hasta `endOfDay`. Cada punto incluye `balanceUsd` con la tasa P2P al final del día.
- `GET /api/accounts/:id` y `GET /api/accounts/:id/balance-history?from=&to=`.
- `update()`: bloquea cambio de `currencyCode` con BadRequestException sugiriendo usar `/fix-currency`.

**Frontend — AccountCard** (`components/AccountCard.tsx`):
- Tarjeta colorida con icono lucide tinted con `iconColor` o foto subida (`photoUrl` prevalece sobre icono).
- Muestra nombre, saldo nativo, USD equiv si la moneda no es USD/USDT/USDC.
- `resolveLucideIcon(key)` mapea kebab-case → componente Lucide. Default Wallet.

**Frontend — Dashboard reorganizado**:
- Cards de cuentas en grid de 2/3/4/5 columnas según viewport (igual a Wallet).
- Cada card es link a `/cuentas/:id`.
- Tile "+ Agregar cuenta" al final.

**Frontend — Página detalle `/cuentas/:id`** (`pages/AccountDetail.tsx`):
- Header con icono/foto + bank name + tipo label en español.
- Botones Editar y Archivar (con confirm).
- Tabs Saldo / Registros + DateRangePicker.
- Tab Saldo: AreaChart de recharts con balanceUsd diario, gradient fill, tooltip custom, delta % vs inicio del periodo.
- Tab Registros: tabla pre-filtrada `accountId={id}`, edit por fila.

**Frontend — AccountDrawer** (`components/AccountDrawer.tsx`, extraído):
- Preview en vivo de cómo se ve la card mientras editas.
- 16 colores preset + ColorPicker custom para card y para icono.
- 20 iconos populares de finanzas (wallet, piggy-bank, banknote, credit-card, landmark, building-2, bitcoin, trending-up, briefcase, shield, gem, home, car, gift, shopping-cart, utensils, plane, wifi, phone, coins).
- Upload de foto: data URL inline (PNG/JPEG/WebP/SVG hasta 400 KB).
- Tipo de cuenta con 16 opciones (incluyendo cripto exchange/wallet).
- Campo "Detalle" (bankName) con hints contextuales según tipo.
- Moneda disabled en edit.
- Monto inicial disabled en edit.
- Toggles "Excluir de las estadísticas" y "Archivar" con descripciones tipo Wallet original.

**Tag**: `v0.8.0`.

**Bug encontrado y resuelto**: `<input type="color">` nativo abre picker del SO, que en drawer derecho de pantalla angosta se sale del viewport. Fix: nuevo componente `ColorPicker` (`components/ui/ColorPicker.tsx`) usando `react-colorful` (~3 KB gz). Popover anclado a la derecha del swatch que se expande hacia adentro del drawer. Incluye HEX text input para paste preciso, click-outside y ESC para cerrar.

**Bundle warning**: 1.4 MB JS (385 KB gz). La importación dinámica de iconos lucide por nombre kebab-case obliga a cargar toda la librería. Aceptable para el uso interno actual; optimización posible: dynamic import por icono con `React.lazy`, o switch a icon-sprite generado en build.

**Pendiente sesión 9**:
- RecordDrawer rico: etiquetas (Labels CRUD), tipo de pago, estado del pago (booked/pending), checkbox "Crear plantilla desde este registro" igual a Wallet.
- Multi-condition UI en Rules.
- Tasa P2P automática vía Binance API (cron job que actualiza ExchangeRate cada hora).
- Selector de tenant + super admin panel.
- Reordenamiento drag-and-drop de categorías.
- Optimization: lazy load icons.
- Receipt photos (fase 7 del roadmap original) + IA BYOK (fase 8).
- API pública per-tenant + MCP server (fases 9-10).
- PWA + offline-first sync (fase 11).
- Capacitor APK (fase 12).
- Deploy a VPS 1 (`wallet.creceideas.com`).
