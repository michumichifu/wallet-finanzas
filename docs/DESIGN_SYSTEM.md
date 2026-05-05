# Design System

Borrador inicial. Se refina en fase 2-3 cuando empiece la UI real. **Pendiente confirmación del usuario antes de construir componentes.**

## Principios

1. **Confianza por sobriedad.** Una app de finanzas no debe parecer un dashboard de marketing. Cero gradientes festivos, cero glassmorphism gratuito, cero sombras de marketing landing. Densidad de información alta pero respirable.
2. **Números primero.** Tipografía con `tabular-nums` siempre que se muestre dinero. Lectura vertical de columnas alineada al céntimo. Datos crudos > decoración.
3. **Modo oscuro por defecto, light de primera clase.** Ambos modos son ciudadanos de primera. El usuario alterna por preferencia, no por contexto. No hay "modo oscuro como afterthought".
4. **Color para señal, no para decoración.** Verde solo en ingresos/positivo, rojo solo en gastos/negativo, ámbar para advertencias. Acento (azul/cobalto) para acciones primarias y enlaces. El resto es neutral.
5. **Iconos sólidos, line-art, mismo grosor.** `lucide-react` con `strokeWidth={2}` por defecto. Tamaños 16/20/24px. Iconos nunca son decoración; siempre indican una entidad o acción.
6. **Path imports `@/...` para todo.** Componentes en `src/components/<dominio>/`, hooks en `src/hooks/`, stores en `src/stores/`, utils en `src/utils/`.

## Referencias estéticas

Mezcla intencional, no copia:
- **Mercury Bank** — banking serio, paleta sobria, tabular nums, jerarquía clara.
- **Linear** — densidad sin sentirse apretada, transiciones sutiles, dark mode impecable.
- **TradingView** — gráficas financieras, grids con sticky headers, comparación temporal.
- **Coinbase Pro / Phantom** — cripto sin parecer un casino, balances en grande, conversión USD primero.
- **Stripe Atlas / Stripe Dashboard** — formularios y tablas que respiran.

Lo que **NO** queremos:
- Estilo "fintech app de neobanco" lleno de tarjetas con gradientes pastel.
- Glassmorphism difuso (acaso mínimo en overlays).
- Iconos coloridos tipo emoji.
- Animaciones de marketing (hover scale 1.05, etc.).

## Tipografía

- **Sans (UI)**: Inter, con features `cv11`, `ss01`, `ss03` activadas. Lo que verás todo el día.
- **Mono (números, IDs, tickers, código)**: JetBrains Mono. Tabular nums siempre que sea cifra.

Cargar de Google Fonts o self-hosted (decisión en fase 2).

## Paleta (CSS variables, en oklch para consistencia perceptual)

Tokens definidos en `frontend/src/index.css`. Light por defecto, `.dark` override.

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--color-bg` | casi blanco frío | casi negro azulado | superficie raíz |
| `--color-bg-subtle` | gris muy claro | un paso más claro que bg | tarjetas, secciones |
| `--color-bg-muted` | gris claro | gris medio | hover, selected |
| `--color-border` | gris suave | gris medio-oscuro | bordes finos |
| `--color-border-strong` | gris medio | gris claro | bordes énfasis |
| `--color-fg` | casi negro | casi blanco | texto principal |
| `--color-fg-muted` | gris medio | gris claro | texto secundario |
| `--color-fg-subtle` | gris claro | gris medio | placeholders, captions |
| `--color-accent` | azul cobalto medio | azul cobalto vivo | acciones primarias, links |
| `--color-positive` | verde balance | verde claro | ingresos, ganancias |
| `--color-negative` | rojo profundo | rojo cálido | gastos, pérdidas |
| `--color-warning` | ámbar | ámbar claro | alertas, validaciones |

OKLCH se elige sobre HSL porque su luminosidad sí refleja brillo perceptual — los pasos `bg → bg-subtle → bg-muted` quedan lineales al ojo.

## Componentes base (cuando se construyan en fase 3)

Lista mínima por orden de prioridad:
1. `Button` — primary/secondary/ghost/destructive, sizes sm/md/lg.
2. `Input`, `Textarea`, `Select`, `Combobox` — todos con label, hint, error.
3. `Card` — superficie elevada con padding y border.
4. `Table` — densidad alta, sticky header, columnas alineadas (numeric a la derecha).
5. `Badge` — para estados, monedas, tipos de pago.
6. `Modal`, `Drawer`, `Popover`, `Tooltip` — Radix UI primitives + Tailwind para estilos.
7. `Skeleton` — loaders coherentes con la jerarquía.
8. `Chart` — wrapper sobre `recharts` con paleta y typography del sistema.
9. `Money` — componente que renderiza un monto con su moneda y formato correcto.
10. `Currency` — selector de moneda con búsqueda.

## Layout

- **App shell**: sidebar fijo a la izquierda (colapsable a iconos en desktop ancho intermedio, drawer en móvil), header simple arriba con toggle de tema y selector de tenant (si super admin), contenido central scrollable.
- **Dashboard**: grid 12 columnas. Tarjetas de cuentas arriba (cripto/fiat mezcladas con badges de tipo), tarjetas de KPI (saldo, flujo, gastos del mes), gráficas debajo, tabla de movimientos recientes al fondo.
- **Móvil**: bottom navigation con 4 iconos (Dashboard, Records, Add, More). Sheet bottom para añadir gasto rápido — un solo toque.

## Animación

Casi inexistente. Solo:
- Transiciones de tema (200ms ease).
- Drawer/modal open/close (180ms cubic-bezier).
- Hover/focus rings (sin movimiento).

Cero scroll-jacking, parallax, o "wow effects".

## Accesibilidad

- Contraste AA mínimo en todos los pares fg/bg, AAA en texto crítico.
- Focus rings visibles con `--color-accent`.
- Keyboard navigation completa.
- ARIA labels en iconos sin texto.
- `prefers-reduced-motion` respetado.
- Tabular nums en TODA cifra para que screen readers lean en orden lineal.

## Próximo paso

Confirmar paleta y referencias con el usuario antes de construir el primer componente. Si algo no convence (ej. el azul cobalto del accent), se ajusta acá.
