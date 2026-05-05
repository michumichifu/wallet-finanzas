# Estado actual

**Última actualización**: 2026-05-05 (fin sesión 8)
**Versión**: `v0.8.0` + fix color picker (no taggeado)
**Repo**: https://github.com/michumichifu/michumichifu/wallet-finanzas (público, AGPL-3.0)
**Local**: `/home/lu/wallet-finanzas/`

## Para retomar en sesión nueva

Lee este archivo + `JOURNAL.md` (últimas 2-3 entradas) + `ROADMAP.md` + `CLAUDE.md` (raíz del repo).

### Arrancar la app en local

```bash
# Backend (puerto 4000)
cd /home/lu/wallet-finanzas/backend
npm run start
# (en otra terminal) frontend (puerto 3001 normalmente, porque 3000 lo usa Panel Ads)
cd /home/lu/wallet-finanzas/frontend
npm run dev
```

URLs:
- Frontend: http://localhost:3001/
- API: http://localhost:4000/api
- Health: http://localhost:4000/api/health (público)

### Credenciales de la cuenta del usuario

```
Email:       luisitoys@gmail.com
Contraseña:  wallet123
```

(Para cambiar: `cd backend && npx ts-node --transpile-only -r tsconfig-paths/register scripts/reset-password.ts <email> <pass>`)

### Postgres local

User/db: `wallet:wallet@localhost:5432/wallet_finanzas`. Conectarse:
```bash
PGPASSWORD=wallet psql -h localhost -U wallet -d wallet_finanzas
```

## Lo que YA está hecho y funcional

### Backend (NestJS 11 + Prisma 6)

- Auth JWT con register/login/refresh/me. Guard global con `@Public()` opt-out.
- Multi-tenant: `tenantId` viaja en JWT. Decorator `@Tenant()` lo extrae.
- Catálogos sembrados: 17 monedas (USD, USDT, USDC, BTC, ETH, SOL, VES, DOP, COP, EUR + región LATAM) + árbol completo de categorías Wallet con `walletEnvelopeId` exacto.
- Importer del CSV de Wallet by BudgetBakers funcional (`POST` no expuesto vía REST aún, solo CLI: `npm run import:wallet -- <ruta.csv>`).
- Exporter CSV y XLS con formato exacto Wallet original (round-trip verificado).
- ExchangeService: convierte cualquier moneda a USD usando snapshots de `ExchangeRate`. Para VEF prioriza `BINANCE_P2P > INFERRED_FROM_TRANSFER > MANUAL > BCV`. Nunca inventa: si no hay tasa, retorna null.
- CRUD completo: Accounts (con bankName/iconKey/iconColor/photoUrl/16 tipos), Categories (con jerarquía + `walletEnvelopeId` para round-trip), Records (con auto-categorización via Rules on-create), Transfers (vista de pares), Templates (gasto rápido aplicable en 1 click), Rules (auto-categorizar por contains/equals/startsWith en note/payee).
- Dashboard: summary (KPIs + comparación periodo anterior), by-category (breakdown), balance-history por cuenta (1 punto/día con USD-equiv).

### Frontend (React + Vite + TS + Tailwind 4 + Zustand)

- Páginas: Login, Register (con confirm password + toggle eye), Dashboard, Cuentas (grid 5 col), Detalle cuenta (`/cuentas/:id` con tabs Saldo/Registros + gráfica histórica recharts), Registros (filtros + paginación + edit), Transferencias (vista pares), Categorías, Reglas, Settings (export CSV+XLS).
- Componentes: Button (4 variants × 3 sizes), Card, Drawer, Input/Textarea/Select/PasswordInput, FieldLabel, ColorPicker (custom react-colorful, no se sale del viewport), DateRangePicker (presets + custom), AccountCard, RecordTypeBadge, ThemeToggle, ProtectedRoute, RecordDrawer (create+edit unificado), AccountDrawer (con icon picker, color picker, photo upload, subtype, bankName), QuickTemplatesPanel.
- Auth store (Zustand persist) con axios interceptors:
  - Request: añade `Authorization: Bearer` automático.
  - Response 401: silent refresh single-flight, retry. Falla → clear → login.
- Theme dark/light persistido en localStorage. `bootstrapTheme()` en `main.tsx` para evitar flash.
- React Query con staleTime 30s.

## Datos del usuario en producción local

| Métrica | Valor |
|---|---|
| Records importados | 2,216 |
| Rango temporal | 2024-04-29 → 2026-04-30 |
| Cuentas | 14 |
| Transfer pairs | 288 |
| Tasas P2P inferidas | 214 |
| Categorías sembradas | 88 |

## Bugs/anomalías conocidas

1. **`Banco ACAP Pesos` quedó USD**: arreglado manualmente en sesión 3 con `/fix-currency`. Ahora es DOP correctamente.
2. **Bundle 1.4 MB JS**: causado por importar todo lucide-react para resolver iconos por nombre kebab-case. Fix posible: dynamic imports.
3. **Native color input se salía**: arreglado en sesión 8 con `react-colorful`.
4. **tsx no respeta `emitDecoratorMetadata`**: el script `import-wallet-csv.ts` debe correrse con `ts-node --transpile-only -r tsconfig-paths/register`, NO con `tsx`. NestJS DI silenciosamente inyecta `undefined` con tsx.

## Pendiente prioritario (orden sugerido)

### Sesión 9 — RecordDrawer rico (igualar Wallet original)
- Etiquetas multi-select (CRUD inline de Labels)
- Tipo de pago (Cash/Debit/Credit/Transfer/Mobile/Crypto/Web/Other)
- Estado del pago (booked/pending) — agregar campo a schema
- Selector "Aplicar plantilla" arriba
- Checkbox "Crear plantilla desde este registro" al final
- Layout 2-columnas tipo Wallet

### Sesión 10 — Tasa P2P automática
- Cron job (BullMQ ya configurado en deps) que pulea Binance P2P API cada hora.
- Pulea CoinGecko para cripto.
- Pobla `ExchangeRate` con `source: BINANCE_P2P` y `COINGECKO`.
- Esto cierra el ciclo BYOK: la conversión USD ya no depende de inferir desde transferencias.

### Sesión 11+ — Receipt photos + IA BYOK (cierra promesa original)
Ver `ROADMAP.md` sección "Hito siguiente sugerido".

### Más adelante
- API pública per-tenant + OpenAPI
- MCP server propio
- PWA + offline-first sync
- Capacitor APK
- Deploy a VPS 1 con `wallet.creceideas.com`

## Cosas a tener en cuenta antes de tocar código

- **NO usar `tsx`** para scripts NestJS standalone. Usar `ts-node --transpile-only -r tsconfig-paths/register`.
- **NO cambiar moneda en update** de Account. Usar el endpoint dedicado `/fix-currency` que también propaga a records.
- **Sin emojis** en código, commits, docs, ni respuestas.
- **Conventional commits** desde el primer commit. Tipos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`. Scopes: `backend`, `frontend`, `db`, `auth`, `import`, `export`, `crypto`, `ia`, `infra`, `account-drawer`, etc.
- **Tag por hito grande**, no por commit. Patrón actual: `v0.8.0` después de account UX rico.
- **Sin URLs hardcoded**. Todo via env vars (`VITE_API_URL`, `APP_BASE_URL`, etc.).
- **Path aliases `@/...`** en TS. Nunca `../../../`.

## Archivos clave a revisar al retomar

| Archivo | Por qué |
|---|---|
| `docs/STATUS.md` | (este) Punto de partida |
| `docs/JOURNAL.md` últimas 2 sesiones | Decisiones recientes |
| `docs/ROADMAP.md` | Estado de fases |
| `docs/ARCHITECTURE.md` | Modelo de datos + módulos |
| `CLAUDE.md` raíz | Reglas operativas para Claude |
| `backend/prisma/schema.prisma` | Schema completo, source of truth |
| `frontend/src/lib/api.ts` | Cliente HTTP tipado, single source of truth de DTOs |
| `frontend/src/App.tsx` | Routing |
| `frontend/src/components/AccountDrawer.tsx` | El drawer más complejo, buen patrón a copiar |
