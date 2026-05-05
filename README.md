# Wallet: Finanzas personales

Webapp multi-tenant de finanzas personales con soporte multi-moneda (fiat + cripto), análisis con IA opcional (BYOK), y compatibilidad de import/export con Wallet by BudgetBakers.

[![GitHub release](https://img.shields.io/github/v/tag/michumichifu/wallet-finanzas)](https://github.com/michumichifu/wallet-finanzas/tags)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

## Estado

**v0.8.0** (2026-05-05). Pre-alfa funcional. Auth, CRUD completo, importer y exporter Wallet-compatible, dashboard con gráfica histórica por cuenta, reglas automáticas. Falta: receipt photos + IA BYOK, cron de tasa P2P, mobile.

Ver [docs/STATUS.md](docs/STATUS.md) para pickup point completo y [docs/ROADMAP.md](docs/ROADMAP.md) para fases.

## Filosofía

- **Deploy-agnóstico**: corre en `localhost`, en `wallet.creceideas.com/`, o en `creceideas.com/wallet/` solo cambiando env vars. Sin URLs hardcoded.
- **Multi-tenant por auth**: el `tenantId` viaja en el JWT, no en la URL. URL única limpia.
- **BYOK para IA**: cada usuario configura su propia API key (Claude, OpenAI, etc.). El servidor no incluye keys globales — los usuarios pagan su consumo.
- **Tasa real, no oficial**: las conversiones a USD usan tasa P2P real (Binance P2P, CoinGecko), no tasas estatales como BCV. Si no hay tasa disponible, retorna `null` antes de inventar.
- **Path imports internos `@/...`**: refactorizar carpetas no rompe imports.
- **Sin emojis**: en código, commits, docs, ni UI.

## Estructura

```
wallet-finanzas/
├── backend/          NestJS 11 + Prisma 6 + Postgres
│   ├── prisma/       Schema (16 modelos, 11 enums) + migraciones
│   ├── scripts/      CLI: import-wallet-csv, reset-password
│   └── src/          14 módulos por dominio (auth, accounts, records, ...)
├── frontend/         React 19 + Vite 8 + TS 5 + Tailwind 4
│   └── src/
│       ├── lib/      Cliente API + helpers
│       ├── stores/   Zustand persist (auth, theme)
│       ├── components/  ui/ (primitivas) + dominio
│       └── pages/    Dashboard, Cuentas, Detalle, Records, ...
├── docs/             Documentación viva
│   ├── STATUS.md     Pickup point para sesión nueva
│   ├── JOURNAL.md    Bitácora por sesión
│   ├── ROADMAP.md    12 fases con estado
│   ├── ARCHITECTURE.md  Decisiones + módulos + flujos
│   └── DESIGN_SYSTEM.md
├── docker/           Compose para dev local (cuando se necesite)
├── scripts/          Scripts auxiliares
├── .github/          CI workflows
└── CLAUDE.md         Instrucciones para asistencia con IA
```

## Quickstart local

Prerrequisito: Postgres y Redis/Valkey nativos en la máquina (no Docker en dev).

```bash
# 1. DB y user (una sola vez)
sudo -u postgres psql \
  -c "CREATE USER wallet WITH PASSWORD 'wallet' CREATEDB;" \
  -c "CREATE DATABASE wallet_finanzas OWNER wallet;"

# 2. Backend
cd backend
cp .env.example .env
# Edita .env: MASTER_KEY=$(openssl rand -hex 32), JWT_SECRET=$(openssl rand -hex 32),
#             JWT_REFRESH_SECRET=$(openssl rand -hex 32)
npm install
npx prisma migrate dev --name init
npm run start                # arranca en :4000

# 3. Frontend (otra terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                  # arranca en :3000 (o 3001 si 3000 ocupado)

# 4. Importar tu historial de Wallet by BudgetBakers
cd backend
npm run import:wallet -- /ruta/al/report_2026-05-04_115314.csv
```

Después, http://localhost:3001/ (o :3000) y login con tu cuenta sembrada.

## Funcionalidades destacadas

### Importación masiva
Importa el CSV exportado por Wallet by BudgetBakers preservando:
- 88 categorías exactas con `walletEnvelopeId` para round-trip
- Transferencias agrupadas en pares con tasa P2P inferida
- Cuentas con tipo heurístico (CRYPTO si nombre incluye USDT, CASH para "Efectivo", etc.)

### Tasa P2P real para VEF
La conversión a USD usa snapshots reales de tasa (Binance P2P > inferida de transferencias > manual > BCV como último recurso). Esto resuelve el bug de Wallet original donde gastos VEF se reportan en céntimos por usar tasa BCV congelada.

### Dashboard tipo Wallet pero mejor
- Grid 5-columnas de tarjetas con icono lucide custom + color tarjeta + color icono + opcional foto/logo subido por el user.
- Detalle de cuenta con gráfica histórica de saldo USD día a día.
- KPIs con comparación vs periodo anterior.
- Breakdown por categoría con date range picker (presets + custom).

### Reglas automáticas (auto-categorizar)
Si la nota contiene "cochino" → categoría Comestibles. Si el beneficiario es "Claro" → Telefonía móvil. Aplican on-create para registros sin categoría manual, o bulk-apply a todo el historial.

### Plantillas (gasto rápido)
Define gastos recurrentes (alquiler, recargas, suscripciones) y aplícalos en 1 click — crea un nuevo Record con la fecha actual.

### Export Wallet-compatible
Descarga CSV o XLS con formato byte-equivalente al export oficial de Wallet by BudgetBakers. Tu data nunca queda atrapada.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | NestJS 11 + Prisma 6 + Postgres + JWT + bcrypt |
| Frontend | React 19 + Vite 8 + TypeScript 5 + Tailwind 4 + Zustand + TanStack Query |
| UI | lucide-react + react-colorful + recharts |
| Storage facturas | MinIO (planeado, fase 7) |
| Mobile | Capacitor (planeado, fase 12) |
| CI | GitHub Actions |

## Licencia

[AGPL-3.0](LICENSE) — GNU Affero General Public License v3.0.

Si modificas este software y lo ofreces como servicio (SaaS), estás obligado a liberar tu código modificado bajo la misma licencia.

## Repo

https://github.com/michumichifu/wallet-finanzas
