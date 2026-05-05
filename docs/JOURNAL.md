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

**Decisiones pendientes del usuario**:
- Cuenta GitHub para crear repo
- Repo público día 1 vs después
- Licencia (MIT, AGPL-3.0, sin licencia)
- Si instala Docker o usamos Postgres nativo Fedora para dev local
