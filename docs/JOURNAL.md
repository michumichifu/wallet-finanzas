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
