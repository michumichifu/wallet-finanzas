# Arquitectura

## Stack

### Backend
- **NestJS 11** (Express) con módulos por dominio.
- **Prisma 6** ORM contra Postgres.
- **Postgres 16+** (instancia local nativa, no Docker en dev).
- **Valkey** (compatible Redis) — instalado pero aún sin uso (planeado para BullMQ jobs).
- **JWT** con `@nestjs/jwt` + `passport-jwt`. Access 15m, Refresh 30d. Secrets distintos (`JWT_SECRET`, `JWT_REFRESH_SECRET`).
- **bcrypt** 10 rounds para passwords.
- **class-validator** + ValidationPipe global con whitelist + transform.
- **csv-parse** + **xlsx** para import/export Wallet.

### Frontend
- **React 19** + **Vite 8** + **TypeScript 5** (strict).
- **Tailwind 4** con plugin Vite. Tokens en oklch (`@theme` directive). Variant `.dark` para tema oscuro.
- **Zustand** para auth + theme (persist en localStorage).
- **TanStack React Query** para data fetching, staleTime 30s.
- **react-router-dom** con basename desde `import.meta.env.BASE_URL`.
- **axios** con interceptors (Bearer token + 401 silent refresh).
- **lucide-react** para iconos.
- **react-colorful** para color picker custom (no nativo).
- **recharts** para gráficas.
- **dayjs** para fechas (importado pero usado mayormente con Intl).

## Multi-tenant

Modelo: **un User puede pertenecer a N Tenants** vía `TenantMembership`. Por ahora el JWT lleva un solo `tenantId` activo (el default resuelto al login: si SUPERADMIN, primer owned; si no, primer membership). Cuando llegue selector de tenant, se cambia el JWT al cambiar de tenant.

### Aislamiento

Todo endpoint protegido extrae `tenantId` con `@Tenant()` (decorator). Todas las queries Prisma filtran por `tenantId`. Sin tenantId no se accede a nada salvo `@Public()` (Health, register/login/refresh).

## Schema (Prisma)

### Auth/tenancy
- `User` (id, email, passwordHash, role: SUPERADMIN/TENANT_OWNER/TENANT_MEMBER)
- `Tenant` (id, slug único, name, refCurrencyCode default USD)
- `TenantMembership` (userId × tenantId)
- `ApiKey` (per tenant, hash + prefijo visible) — schema listo, no implementado endpoint
- `AiCredential` (per user×tenant, encryptedKey AES-256-GCM con MASTER_KEY env) — schema listo, no implementado

### Catálogos globales
- `Currency` (PK natural = code: USD, USDT, BTC...). 17 monedas sembradas.
- `ExchangeRate` (snapshots con source enum: MANUAL, BINANCE_P2P, COINGECKO, COINMARKETCAP, IMPORTED, INFERRED_FROM_TRANSFER, BCV)

### Cuentas y categorías
- `Account` (16 tipos enum, bankName, iconKey, iconColor, photoUrl, color, initialBalance, currencyCode inmutable post-create)
- `Category` (jerárquica self-ref, slug único por tenant, walletEnvelopeId para round-trip Wallet)
- `Label` (chips secundarios, schema listo, sin UI)

### Transacciones
- `Record` (decimal 28,8 amount, currencyCode, type: EXPENSE/INCOME/TRANSFER, paymentType, occurredAt, isTransfer, transferPairId opcional, importBatchId opcional)
- `TransferPair` (vincula 2 records con appliedRate + rateSource)
- `RecordLabel` (m2m)

### Recibos (schema listo, sin UI)
- `Receipt` (status: UPLOADED/PARSING/PARSED/CONFIRMED/FAILED)
- `ReceiptPhoto` (storageKey, sha256, position dentro del recibo)

### Automatización
- `Template` (payload JSON aplicable on-demand)
- `AutomaticRule` (condition JSON + action JSON, priority, isActive)
- `Envelope` (presupuestos por categoría, schema listo, sin UI)

### Auditoría
- `ImportBatch` (cada importación CSV con report JSON estructurado)

Total: 16 modelos, 11 enums.

## Módulos backend

```
backend/src/
├── prisma/                    Global. PrismaService extiende PrismaClient
├── exchange/                  Global. toUsd() con política VEF (P2P > BCV)
├── catalog/                   seedCurrencies + seedWalletCategoriesForTenant
├── import/                    Importer CSV Wallet (script CLI standalone)
├── auth/                      JWT register/login/refresh/me + JwtAuthGuard global
├── tenant/                    @Tenant() y @CurrentUser() decorators
├── accounts/                  CRUD + getOne + balanceHistory + fixCurrency
├── categories/                CRUD jerárquico
├── records/                   CRUD + transfer + auto-categorize on create
├── transfers/                 Vista de pares con tasa aplicada
├── templates/                 BYO recurring + apply
├── rules/                     Predicate engine + apply-all
├── export/                    CSV + XLS Wallet-compatible
├── dashboard/                 Summary + by-category + previousPeriod
├── health/                    Health check público
└── config/                    env.validation con class-validator
```

## Componentes frontend clave

```
frontend/src/
├── lib/
│   ├── api.ts                 Cliente axios + interceptors + TODOS los DTOs tipados
│   ├── cn.ts                  twMerge + clsx helper
│   └── format.ts              fmtUsd, fmtMoneyByCurrency, fmtPercentDelta, etc.
├── stores/
│   ├── auth.store.ts          accessToken/refreshToken/user/tenant
│   └── theme.store.ts         dark/light + bootstrapTheme()
├── components/
│   ├── ui/                    Primitivas: Button, Card, Drawer, Input, PasswordInput, ColorPicker
│   ├── layout/
│   │   ├── AppShell.tsx       Sidebar + header + Outlet
│   │   └── Sidebar.tsx        Nav + user info + logout
│   ├── ProtectedRoute.tsx     Redirect a /login si no token
│   ├── ThemeToggle.tsx
│   ├── DateRangePicker.tsx    Presets + custom
│   ├── AccountCard.tsx        Tarjeta con icono lucide o foto
│   ├── AccountDrawer.tsx      Edit drawer rico (color, icono, foto, subtipo)
│   ├── RecordDrawer.tsx       Create + Edit unificado (3 modes)
│   ├── RecordTypeBadge.tsx
│   └── QuickTemplatesPanel.tsx
└── pages/
    ├── Login.tsx + Register.tsx
    ├── Dashboard.tsx          Grid 5col cuentas + KPIs + breakdown
    ├── Accounts.tsx + AccountDetail.tsx
    ├── Records.tsx
    ├── Transfers.tsx
    ├── Categories.tsx
    ├── Rules.tsx
    └── Settings.tsx           Export CSV/XLS + perfil
```

## Decisiones arquitectónicas firmes

- **Multi-tenant por auth, no por URL**: JWT `tenantId`. URL única limpia.
- **Mirror máximo de Wallet** + extensiones propias. CSV/XLS round-trip verificado.
- **Cripto = cuenta normal** con `currency_code`. NO tabla aparte. Cuenta del tipo CRYPTO_EXCHANGE/CRYPTO_WALLET para granularidad.
- **Tasa para VEF**: prioridad `BINANCE_P2P > INFERRED_FROM_TRANSFER > MANUAL > BCV`. Si no hay, `null` (no inventa).
- **Encriptación de API keys IA**: AES-256-GCM con `MASTER_KEY` env. Helper pendiente; schema listo.
- **Fotos de factura** (cuando se implemente fase 7): entidad `Receipt` con N `ReceiptPhoto`. Parser IA recibe todas las fotos juntas.
- **Path aliases `@/...`** en TypeScript. Nunca `../../../`.
- **Deploy-agnóstico**: `BASE_URL` y `APP_BASE_URL` por env. La app corre en `localhost`, en `wallet.creceideas.com/`, o en `creceideas.com/wallet/` indistintamente.
- **AccountType inmutable**: una vez creada la cuenta, su moneda no se puede cambiar desde el editor (solo desde `/fix-currency` para corregir imports erróneos).

## Sistema de diseño

Ver `DESIGN_SYSTEM.md`. Resumen:
- **Estética**: financial cripto wall street. Mercury / Linear / TradingView / Coinbase Pro / Phantom.
- **Tipografía**: Inter (UI) + JetBrains Mono (números).
- **Tabular nums** en TODA cifra.
- **Iconos**: lucide-react, strokeWidth 2, sizes 16/20/24.
- **Color**: paleta neutra (greys cool oklch) + accent azul cobalto. Verde positivo / rojo negativo / ámbar warning.
- **Animación**: casi inexistente. 200ms ease para tema, 180ms cubic-bezier para drawer/modal.
- **Cero glassmorphism difuso. Cero gradientes festivos. Cero emojis.**

## Tasas de cambio

### Política de conversión a USD

```
toUsd(amount, currency, at):
  if currency in {USD, USDT, USDC}: return amount
  if currency in {VEF, VES}:
    rate = findVefRate(at)  # P2P > INFERRED > MANUAL > BCV
    return rate ? amount/rate : null
  rate = closestSnapshot(currency, USD, at)
  if rate: return amount * rate
  rate = closestSnapshot(USD, currency, at)
  if rate: return amount / rate
  fallback = FALLBACK_RATES[currency]  # DOP=60, COP=4000, EUR=0.92, etc.
  return fallback ? amount/fallback : null
```

### Snapshots disponibles

- `INFERRED_FROM_TRANSFER`: 214 inferidas del CSV original (de transferencias USDT↔Bs).
- `MANUAL`: si el usuario crea una transferencia, su tasa aplicada se guarda como MANUAL.
- `BINANCE_P2P` y `COINGECKO`: PENDIENTES (cron job de fase 5).

## Flujo de auto-categorización (Rules)

```
RecordsService.create(dto):
  if dto.categoryId is null:
    match = RulesService.evaluateForRecord(tenant, candidate)
    if match: dto.categoryId = match.action.setCategoryId
  prisma.record.create({...})
```

```
RulesService.evaluateForRecord:
  rules = AutomaticRule findMany where isActive, order priority asc
  for r in rules:
    if evaluateRule(r.condition, candidate): return {ruleId, action}
  return null
```

Operadores: contains, notContains, equals, startsWith, endsWith, gt, gte, lt, lte. Combinator AND/OR.

## Importer Wallet CSV — flujo

1. Parser puro lee CSV con `;` separator, BOM-tolerant.
2. Valida columnas requeridas.
3. Detecta cuentas únicas → crea con tipo heurístico (CRYPTO si USDT, CASH si "Efectivo", GENERAL si no).
4. Agrupa transferencias por timestamp + isTransfer=true.
5. Por cada par debit/credit con monedas distintas, calcula `appliedRate = credit/abs(debit)` y la guarda en `ExchangeRate` con source `INFERRED_FROM_TRANSFER`.
6. Crea `TransferPair` y los 2 records vinculados.
7. Persiste records normales con categoría matched por `walletEnvelopeId`.
8. Reporte JSON en `ImportBatch.report` con scanned/imported/skipped/errors/inferredRates/accountsCreated.

## Hosting (planeado, NO deployed)

- **VPS 1**: `wallet.creceideas.com` con nginx + Docker compose prod.
- Postgres y Valkey (Redis) **nativos** en local dev (no Docker).
- En prod: todo en Docker compose con volumes persistentes.
- MinIO en VPS para Receipt photos.
- HTTPS via Let's Encrypt / Caddy / nginx.

## Convenciones git

- Conventional commits desde el primer commit.
- Tags semver por hito mayor: `v0.0.1` → `v0.8.0`.
- Branch único: `main`. Feature branches solo si hay PR review (no aplica solo-dev).
- Commit messages largos cuando hay decisión arquitectónica. Cortos cuando es trivial.
