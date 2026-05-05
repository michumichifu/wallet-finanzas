# Roadmap

12 fases. ~18-20 semanas part-time. Cada fase entrega salida usable.

| # | Fase | Estado | Salida |
|---|------|--------|--------|
| 0 | Setup + Wallet API docs + repo skeleton | COMPLETADO | docs, monorepo, esquema Prisma inicial, design system |
| 1 | Schema Prisma + import CSV (2217 records) | COMPLETADO | 2,216 records importados, 14 cuentas, 88 categorías, 214 tasas P2P inferidas en 25s |
| 2 | Multi-tenant + auth + super admin | EN CURSO (40%) | endpoints REST funcionales con tenant via header (pre-auth), dashboard inicial con KPIs en USD-P2P real. Pendiente: auth real (JWT), super admin, login UI |
| 3 | CRUD completo + responsive | pendiente | records, transfers, accounts, categories, labels, plantillas, reglas |
| 4 | Export Wallet-compatible (CSV/XLS round-trip) | pendiente | data nunca atrapada |
| 5 | Cripto + APIs de tasas | pendiente | USDT/BTC/ETH/SOL/USDC con rates auto |
| 6 | Analytics con tasa P2P real | pendiente | reportes en USD reales |
| 7 | Fotos factura multi-parte + MinIO | pendiente | Receipt + ReceiptPhoto, upload múltiple |
| 8 | IA BYOK + parser facturas | pendiente | Claude Vision parsea tickets largos |
| 9 | API pública per-tenant + OpenAPI | pendiente | API key, rate limiting, swagger |
| 10 | MCP server propio | pendiente | conexión Claude desktop/web a la data |
| 11 | PWA + offline-first sync | pendiente | service worker + IndexedDB + sync engine |
| 12 | Capacitor APK + distribución VPS | pendiente | reemplaza Wallet móvil |

## Lo que sale de fase 0 (en curso)

- Estructura de monorepo creada
- README + CLAUDE.md + .gitignore + roadmap
- Backend NestJS scaffolded con TS, ESLint, prettier
- Frontend Vite + React + TS scaffolded con Tailwind
- Schema Prisma inicial reflejando el CSV de Wallet
- Docker compose con Postgres + MinIO + Redis para dev local
- GitHub Actions: lint + typecheck + build en cada PR
- Path aliases configurados en backend y frontend
- Primer release tagged `v0.0.1`

## Salida de fase 1

- Endpoint `POST /api/import/wallet-csv` operativo
- 2217 records del CSV del usuario importados a Postgres
- Endpoints `GET /api/accounts`, `/api/categories`, `/api/records` (con paginación + filtros)
- Inferencia automática de tasa P2P desde transferencias del CSV
- Tabla `exchange_rate` poblada con histórico inferido
