# Instrucciones para Claude — proyecto Wallet: Finanzas personales

Lee esto primero en cada sesión. Después de este archivo, lee:
- `docs/STATUS.md` — pickup point con estado al 2026-05-05
- `docs/JOURNAL.md` — últimas 2-3 entradas
- `docs/ROADMAP.md` — fases y pendientes
- `docs/ARCHITECTURE.md` — modelo de datos + módulos
- `~/.claude/projects/-home-lu/memory/project_wallet_replica.md`
- `~/.claude/projects/-home-lu/memory/project_wallet_design.md`
- `~/.claude/projects/-home-lu/memory/user_finance_app.md`
- `~/.claude/projects/-home-lu/memory/user_finance_method.md`

## Reglas de oro

1. **Sin emojis** en código, logs, commits, docs, ni respuestas al usuario. Iconos en UI vía `lucide-react`.
2. **Conventional commits** desde el primer commit. Formato: `<tipo>(<scope>): <descripción>`. Tipos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`. Scopes: `backend`, `frontend`, `db`, `auth`, `import`, `export`, `crypto`, `ia`, `infra`, `account-drawer`, etc.
3. **Sin URLs hardcoded.** Todo via env vars. App debe correr en `localhost`, `wallet.creceideas.com/`, o `creceideas.com/wallet/` indistintamente.
4. **Path imports** con alias `@/...` en backend (`tsconfig.json`) y frontend (`vite.config.ts` + `tsconfig.json`). Nunca usar `../../../`.
5. **El usuario prefiere comandos únicos sobre listas multi-paso.** Si necesitas que ejecute algo, dale un solo bash chain.
6. **Tag por hito grande**, no por commit. Patrón: `v0.6.0`, `v0.7.0`, `v0.8.0`.
7. **Probar antes de cantar victoria**: smoke test con curl después de cambiar backend, build TS antes de commit, ver el dev server arranca antes de hacer claims.

## Stack actual (no inventar variantes)

### Backend
- **NestJS 11** + **Prisma 6** + **Postgres** (nativo, NO Docker en dev)
- **Valkey** (Redis-compatible) instalado, sin uso aún
- **JWT** + **Passport** + **bcrypt**
- **class-validator** + ValidationPipe global
- **csv-parse** + **xlsx** para import/export Wallet
- **`@nestjs/mapped-types`** para PartialType en UpdateDto
- Ejecución de scripts CLI: `ts-node --transpile-only -r tsconfig-paths/register` (NO `tsx` — no respeta `emitDecoratorMetadata`)

### Frontend
- **React 19** + **Vite 8** + **TS 5** strict
- **Tailwind 4** con plugin Vite. Tokens en oklch (`@theme`). Variant `.dark`.
- **Zustand** persist para auth + theme
- **TanStack React Query** staleTime 30s
- **react-router-dom** con `basename={import.meta.env.BASE_URL}`
- **axios** con interceptor de Bearer + 401 silent refresh
- **lucide-react** (iconos), **react-colorful** (color picker), **recharts** (gráficas), **dayjs** (fechas)

## Decisiones arquitectónicas firmes (no cambiar sin razón)

- **Multi-tenant por auth, no por URL.** JWT `tenantId`. URL única limpia.
- **Mirror máximo de Wallet** + extensiones propias. CSV/XLS round-trip.
- **Cripto = cuenta normal** con `currency_code`. Cuenta tipo CRYPTO_EXCHANGE/CRYPTO_WALLET para granularidad.
- **Tasa para VEF**: prioridad `BINANCE_P2P > INFERRED_FROM_TRANSFER > MANUAL > BCV`. Si no hay, retorna null. Nunca inventa.
- **Fotos de factura** (cuando se implemente): entidad `Receipt` con N `ReceiptPhoto`. Parser IA recibe todas juntas.
- **Encriptación de API keys IA**: AES-256-GCM con `MASTER_KEY` env. Nunca loguear keys.
- **AccountType y currencyCode INMUTABLES post-create**. Solo `/fix-currency` los puede cambiar (con propagación a records).

## Cosas que NO debe hacer Claude

- Crear archivos `.md` que el usuario no pidió (no escribir docs decorativos sin valor).
- Agregar dependencias sin justificarlas en el commit.
- Pushear a GitHub sin permiso explícito (excepto cuando el usuario diga "continua" sobre un trabajo en curso — ahí ya implica autorización para push del trabajo).
- Hardcodear URLs, tokens, o paths absolutos en código fuente.
- Usar la API de Wallet by BudgetBakers — usamos solo el CSV exportado para migración.
- Usar `tsx` para scripts NestJS standalone (DI silenciosa undefined).
- Mockear data en tests con datos falsos cuando el CSV real (2,217 registros) está disponible como fixture.

## Comandos frecuentes

```bash
# Backend dev
cd /home/lu/wallet-finanzas/backend
npm run start          # nest start (compila on-the-fly)
npm run start:dev      # nest start --watch
npm run build          # nest build → dist/

# Backend scripts (importer, reset password, etc.)
npx ts-node --transpile-only -r tsconfig-paths/register scripts/<nombre>.ts <args>
# Atajo:
npm run import:wallet -- /home/lu/Downloads/report_*.csv

# Backend Prisma
npx prisma migrate dev --name <nombre>
npx prisma generate
npx prisma studio       # GUI en localhost:5555

# Frontend dev
cd /home/lu/wallet-finanzas/frontend
npm run dev            # vite (puerto 3001 normalmente)
npm run build          # tsc -b && vite build

# Postgres
PGPASSWORD=wallet psql -h localhost -U wallet -d wallet_finanzas

# Auth (smoke test)
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"luisitoys@gmail.com","password":"wallet123"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['accessToken'])")
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/accounts
```

## Estado de fases (al 2026-05-05)

Ver `docs/ROADMAP.md` para detalle. Resumen:
- Fases 0-4, 6: COMPLETADAS
- Fase 5 (cripto + tasas auto): 40% — schema OK, falta cron Binance P2P + CoinGecko
- Fases 7-12: PENDIENTES (receipts/IA/API/MCP/PWA/APK/deploy)

## Pendiente prioritario

1. **RecordDrawer rico** (sesión 9): etiquetas, tipo pago, estado pago, "crear plantilla desde este registro"
2. **Tasa P2P automática** (sesión 10): cron BullMQ contra Binance P2P API
3. **Receipt photos + IA BYOK** (sesiones 11+): cierra promesa original del proyecto
4. **Deploy a VPS** cuando esté presentable

## Archivos clave a no perder de vista

- `/home/lu/Downloads/report_2026-05-04_115314.csv` — CSV semilla de Wallet del usuario, 2,217 records.
- `backend/prisma/schema.prisma` — source of truth del modelo de datos.
- `frontend/src/lib/api.ts` — DTOs tipados, single source of truth para frontend ↔ backend.
- `docs/STATUS.md` — pickup point en cada sesión nueva.

## Credenciales de la app (single-user actual)

```
Email:       luisitoys@gmail.com
Contraseña:  wallet123
```

Para resetear:
```bash
cd /home/lu/wallet-finanzas/backend
npx ts-node --transpile-only -r tsconfig-paths/register scripts/reset-password.ts <email> <pass>
```
