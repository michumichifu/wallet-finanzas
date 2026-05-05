# Instrucciones para Claude — proyecto Wallet: Finanzas personales

Lee esto primero en cada sesión. También revisa `~/.claude/projects/-home-lu/memory/project_wallet_replica.md` y `user_finance_app.md` y `user_finance_method.md`.

## Reglas de oro

1. **Sin emojis** en código, logs, commits, docs, ni respuestas al usuario. Iconos en UI vía `lucide-react`.
2. **Conventional commits** desde el primer commit. Formato: `<tipo>(<scope>): <descripción>`. Tipos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`. Scopes: `backend`, `frontend`, `db`, `auth`, `import`, `export`, `crypto`, `ia`, `infra`.
3. **Sin URLs hardcoded.** Todo via env vars. App debe correr en `localhost:3000`, `wallet.creceideas.com/`, o `creceideas.com/wallet/` indistintamente.
4. **Path imports** con alias `@/...` en backend (`tsconfig.json`) y frontend (`vite.config.ts` + `tsconfig.json`). Nunca usar `../../../`.
5. **Nada se sube a GitHub** sin que el usuario apruebe el push. El primer push sucede cuando el usuario dé luz verde.
6. **El usuario prefiere comandos únicos sobre listas multi-paso.** Si necesitas que él ejecute algo, dame un solo bash chain.

## Stack confirmado

- **Backend**: NestJS + Prisma + Postgres + class-validator + JWT + Passport + BullMQ (jobs) + ioredis
- **Frontend**: React + Vite + TS + Tailwind + Zustand + react-router-dom + lucide-react + @tanstack/react-query + axios + recharts + react-hook-form + zod + dayjs
- **Storage facturas**: MinIO (S3-compatible)
- **Mobile (fase 12)**: Capacitor wrap de la PWA
- **CI**: GitHub Actions

## Decisiones arquitectónicas firmes

- **Multi-tenant por auth, no por URL.** JWT incluye `tenantId`. Middleware NestJS inyecta `request.tenant`. Super admin es un role JWT distinto, mismo URL.
- **Mirror máximo de Wallet** + extensiones propias. Compatibilidad CSV/XLS round-trip con Wallet original.
- **Cripto = cuenta normal** con `currency_code` (USDT, BTC, ETH...). NO tabla aparte. Tasas via CoinGecko (sin auth).
- **Tasa P2P para VEF**: Binance P2P API. Snapshots con timestamp guardados en `exchange_rate`. Cada record opcionalmente referencia el snapshot usado.
- **Encriptación de API keys IA**: AES-256-GCM con `MASTER_KEY` env. Nunca loguear keys.
- **Fotos de factura**: entidad `Receipt` con N `ReceiptPhoto`. El parser IA recibe todas las fotos juntas (tickets largos de supermercado).

## Archivos clave a no perder de vista

- `/home/lu/Downloads/report_2026-05-04_115314.csv` — CSV exportado de Wallet del usuario, 2,217 records. Es la data semilla y el formato que debemos importar/exportar.
- Catálogo de categorías padre/sub: ver `~/.claude/projects/-home-lu/memory/user_finance_app.md`.
- Cuentas del usuario actuales: BDV Bs, Mercantil Bs, USDT Binance, BDV USD, PayPal, Banco BHD pesos, Banco ACAP Pesos, Wally USD, Facebank PR, ApoloPay, Zinli, EFECTIVO USD, Efectivo, Efectivo COP.

## Estado de fases

Ver `docs/ROADMAP.md` y `docs/JOURNAL.md` (este último se actualiza por sesión).

## Cosas que NO debe hacer Claude en este proyecto

- Crear archivos `.md` que el usuario no pidió (no escribir docs decorativos).
- Agregar dependencias sin justificarlas en el commit.
- Pushear a GitHub sin permiso explícito.
- Hardcodear URLs, tokens, o paths absolutos en código fuente.
- Usar la API de Wallet by BudgetBakers — ya quedó claro: **usamos solo el CSV exportado** para migración y referencia de modelo. NO golpeamos su API.
- Mockear data en tests con datos falsos cuando podemos usar el CSV real (2217 registros) como fixture.
