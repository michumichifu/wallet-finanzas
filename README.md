# Wallet: Finanzas personales

App multi-tenant de finanzas personales con soporte multi-moneda (fiat + cripto), análisis de IA opcional, y compatibilidad de import/export con Wallet by BudgetBakers.

## Estado actual

Pre-alfa. Fase 0 (setup inicial). Ver [docs/ROADMAP.md](docs/ROADMAP.md).

## Estructura del repo

```
wallet-finanzas/
├── backend/          NestJS + Prisma + Postgres
├── frontend/         React + Vite + TS + Tailwind
├── docs/             Documentación de arquitectura, modelo, decisiones
├── docker/           Docker compose para dev local
├── scripts/          Scripts auxiliares (importers, etc.)
└── .github/          CI workflows
```

## Filosofía

- **Deploy-agnóstico**: corre en `localhost`, en `wallet.creceideas.com/`, o en `creceideas.com/wallet/` solo cambiando env vars. Sin URLs hardcoded.
- **Multi-tenant por auth**: el `tenantId` viaja en el JWT, no en la URL. URL única limpia para todos.
- **BYOK para IA**: cada usuario configura su propia API key (Claude, OpenAI, etc.). El servidor no incluye keys globales — los usuarios pagan su consumo.
- **Tasa real, no oficial**: las conversiones a USD usan tasa P2P real (Binance P2P, CoinGecko), no tasas estatales como BCV.
- **Path imports internos**: aliases `@/...` en TypeScript/Vite — refactorizar carpetas no rompe imports.

## Roadmap resumen

12 fases, ~4-5 meses part-time. Fase 1 entrega valor inmediato (importa el CSV de Wallet original con tasa P2P real). Ver [docs/ROADMAP.md](docs/ROADMAP.md) para detalle.

## Licencia

[AGPL-3.0](LICENSE) — GNU Affero General Public License v3.0.

Si modificas este software y lo ofreces como servicio (SaaS), estás obligado a liberar tu código modificado bajo la misma licencia.

## Repo

https://github.com/michumichifu/wallet-finanzas
