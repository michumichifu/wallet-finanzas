# Roadmap

12 fases originales. Estado actualizado al 2026-05-05. Versión actual: `v0.8.0` + fix color picker (sin tag).

| # | Fase | Estado | Notas |
|---|------|--------|-------|
| 0 | Setup + repo skeleton | COMPLETADO | docs, monorepo, Docker compose pendiente prod, CI base, Prisma init, design tokens |
| 1 | Schema Prisma + import CSV (2,217 records) | COMPLETADO | 2,216 records importados, 14 cuentas, 88 categorías, 17 monedas, 214 tasas P2P en 25s |
| 2 | Multi-tenant + auth + super admin | COMPLETADO (90%) | Auth JWT funcional, register/login UI, ProtectedRoute, refresh interceptor, logout. Pendiente: super admin panel, selector de tenant |
| 3 | CRUD completo + responsive | COMPLETADO | Records, Accounts (con icono/color/foto), Categories, Templates, Rules. Solo Labels editables faltan |
| 4 | Export Wallet-compatible (CSV/XLS) | COMPLETADO | Round-trip verificado. CSV en sesión 6, XLS en sesión 7 |
| 5 | Cripto + APIs de tasas | EN CURSO (40%) | Cuentas tipo CRYPTO_EXCHANGE / CRYPTO_WALLET soportadas en schema. Pendiente: cron job que pulee Binance P2P + CoinGecko cada hora y popule `ExchangeRate` |
| 6 | Analytics con tasa P2P real | COMPLETADO | Dashboard con KPIs, breakdown por categoría, comparación periodo anterior, gráfica histórica de saldo por cuenta. Todo con tasa P2P real, no BCV |
| 7 | Fotos factura multi-parte + MinIO | PENDIENTE | Schema ya tiene `Receipt` y `ReceiptPhoto`. Falta: endpoint upload, MinIO setup, UI multi-foto en RecordDrawer |
| 8 | IA BYOK + parser facturas | PENDIENTE | Schema tiene `AiCredential` con encriptado. Falta: encryption helper (AES-256-GCM), formulario para pegar API key Anthropic/OpenAI, integración Claude Vision para parsear ticket largo |
| 9 | API pública per-tenant + OpenAPI | PENDIENTE | Schema tiene `ApiKey`. Falta: generación de API key con prefijo visible, OpenAPI spec via `@nestjs/swagger`, rate limiting middleware |
| 10 | MCP server propio | PENDIENTE | Servidor MCP que cada user pueda conectar a su Claude desktop/web con su API key |
| 11 | PWA + offline-first sync | PENDIENTE | Service worker, IndexedDB local, sync engine con resolución last-write-wins |
| 12 | Capacitor APK + distribución VPS | PENDIENTE | Capacitor wrap de la PWA, distribución de APK desde VPS o F-Droid |

## Pendiente menor (pulido, sin bloquear avance)

- Multi-condition UI en Rules (backend ya soporta)
- Drag-and-drop reordenamiento categorías
- Receipt photos sin IA (solo upload + storage) como paso intermedio
- Optimization: lazy load de iconos lucide para reducir bundle
- Selector de tenant en sidebar (cuando user pertenezca a múltiples)
- Tests automáticos (jest backend, vitest/playwright frontend) — ahora hay scaffolding pero sin tests escritos
- Deploy a VPS 1 con `wallet.creceideas.com` + nginx + Docker compose prod

## RecordDrawer mejoras (próxima sesión 9)

Pediente igualar el modal de Wallet original:
- Selector de plantilla arriba ("Seleccionar plantilla" + botón crear)
- Checkbox "Crear plantilla desde este registro" al final
- Etiquetas (Labels) — chips multi-select con CRUD inline
- Tipo de pago como dropdown (CASH, DEBIT_CARD, CREDIT_CARD, TRANSFER, MOBILE_PAYMENT, etc.)
- Estado del pago (booked / pending) — campo nuevo en schema
- Layout dos columnas: lado izquierdo "principal", lado derecho "otros detalles" como Wallet

## Hito siguiente sugerido

El próximo gran salto en valor para el usuario diario es **Receipt photos + IA BYOK** (fases 7-8). Eso cierra el círculo de la motivación original del proyecto: "Wallet no permite subir fotos de facturas". Backend tiene schema. Falta:

1. Endpoint `POST /api/receipts` con multer (multi-foto) → guarda en MinIO o disco local.
2. Endpoint `POST /api/receipts/:id/parse` que toma todas las fotos del recibo, llama a Claude Vision con la API key del user (`AiCredential` desencriptada), guarda el JSON en `Receipt.parsedData`.
3. UI: drawer "Nueva factura" con upload de N fotos → preview + parseo → confirmar → genera 1 o más records vinculados.
4. Encryption helper para `MASTER_KEY` AES-256-GCM (ya está como env var).

Tiempo estimado: 2-3 sesiones part-time.
