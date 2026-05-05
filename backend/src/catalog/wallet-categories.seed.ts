import { CategoryKind } from '@prisma/client'

export interface WalletCategoryNode {
  slug: string
  name: string
  kind: CategoryKind
  /** ID interno de Wallet original (envelope_id en CSV). */
  walletEnvelopeId?: string
  children?: WalletCategoryNode[]
}

/**
 * Catálogo de categorías idéntico al árbol estándar de Wallet by BudgetBakers,
 * con los mismos `walletEnvelopeId` que aparecen en su export CSV. Esto permite
 * que cada record importado del CSV haga match exacto contra una categoría.
 */
export const WALLET_CATEGORY_TREE: WalletCategoryNode[] = [
  {
    slug: 'comida-y-bebidas',
    name: 'Comida y bebidas',
    kind: 'EXPENSE',
    walletEnvelopeId: '1',
    children: [
      { slug: 'comestibles', name: 'Comestibles', kind: 'EXPENSE', walletEnvelopeId: '1000' },
      { slug: 'restaurante-comida-rapida', name: 'Restaurante, comida rápida', kind: 'EXPENSE', walletEnvelopeId: '1001' },
      { slug: 'bar-cafeteria', name: 'Bar, cafetería', kind: 'EXPENSE', walletEnvelopeId: '1002' },
      // En el CSV del usuario aparece "Comida y bebidas" como sub. Se conserva.
      { slug: 'comida-y-bebidas-otros', name: 'Comida y bebidas', kind: 'EXPENSE', walletEnvelopeId: '1003' },
    ],
  },
  {
    slug: 'compras',
    name: 'Compras',
    kind: 'EXPENSE',
    walletEnvelopeId: '2',
    children: [
      { slug: 'ropa-y-calzado', name: 'Ropa y calzado', kind: 'EXPENSE', walletEnvelopeId: '2000' },
      { slug: 'compras-otros', name: 'Compras', kind: 'EXPENSE', walletEnvelopeId: '2010' },
      { slug: 'salud-y-belleza', name: 'Salud y belleza', kind: 'EXPENSE', walletEnvelopeId: '2002' },
      { slug: 'joyeria-accesorios', name: 'Joyería, accesorios', kind: 'EXPENSE', walletEnvelopeId: '2003' },
      { slug: 'hogar-jardin', name: 'Hogar, jardín', kind: 'EXPENSE', walletEnvelopeId: '2004' },
      { slug: 'ninos', name: 'Niños', kind: 'EXPENSE', walletEnvelopeId: '2005' },
      { slug: 'electronica-accesorios', name: 'Electrónica, accesorios', kind: 'EXPENSE', walletEnvelopeId: '2006' },
      { slug: 'tiempo-libre', name: 'Tiempo libre', kind: 'EXPENSE', walletEnvelopeId: '2007' },
      { slug: 'mascotas-animales', name: 'Mascotas, animales', kind: 'EXPENSE', walletEnvelopeId: '2008' },
      { slug: 'papeleria-herramientas', name: 'Papelería, herramientas', kind: 'EXPENSE', walletEnvelopeId: '2009' },
      { slug: 'regalos-alegrias', name: 'Regalos, alegrías', kind: 'EXPENSE', walletEnvelopeId: '2012' },
      { slug: 'drogueria-farmacia', name: 'Droguería, farmacia', kind: 'EXPENSE', walletEnvelopeId: '2011' },
    ],
  },
  {
    slug: 'vivienda',
    name: 'Vivienda',
    kind: 'EXPENSE',
    walletEnvelopeId: '3',
    children: [
      { slug: 'alquiler', name: 'Alquiler', kind: 'EXPENSE', walletEnvelopeId: '3000' },
      { slug: 'hipoteca', name: 'Hipoteca', kind: 'EXPENSE', walletEnvelopeId: '3001' },
      { slug: 'energia-servicios', name: 'Energía, servicios', kind: 'EXPENSE', walletEnvelopeId: '3002' },
      { slug: 'servicios', name: 'Servicios', kind: 'EXPENSE', walletEnvelopeId: '3003' },
      { slug: 'mantenimiento-reparaciones', name: 'Mantenimiento, reparaciones', kind: 'EXPENSE', walletEnvelopeId: '3004' },
      { slug: 'seguro-de-propiedad', name: 'Seguro de propiedad', kind: 'EXPENSE', walletEnvelopeId: '3005' },
    ],
  },
  {
    slug: 'transporte',
    name: 'Transporte',
    kind: 'EXPENSE',
    walletEnvelopeId: '4',
    children: [
      { slug: 'transporte-publico', name: 'Transporte público', kind: 'EXPENSE', walletEnvelopeId: '4000' },
      { slug: 'taxi', name: 'Taxi', kind: 'EXPENSE', walletEnvelopeId: '4001' },
      { slug: 'larga-distancia', name: 'Larga distancia', kind: 'EXPENSE', walletEnvelopeId: '4002' },
      { slug: 'viajes-de-negocios', name: 'Viajes de negocios', kind: 'EXPENSE', walletEnvelopeId: '4003' },
      // Subcategoría "Transporte" genérica (la usa el usuario).
      { slug: 'transporte-otros', name: 'Transporte', kind: 'EXPENSE', walletEnvelopeId: '4004' },
    ],
  },
  {
    slug: 'vehiculo',
    name: 'Vehículo',
    kind: 'EXPENSE',
    walletEnvelopeId: '5',
    children: [
      { slug: 'combustible', name: 'Combustible', kind: 'EXPENSE', walletEnvelopeId: '5000' },
      { slug: 'estacionamiento', name: 'Estacionamiento', kind: 'EXPENSE', walletEnvelopeId: '5001' },
      { slug: 'mantenimiento-de-vehiculos', name: 'Mantenimiento de vehículos', kind: 'EXPENSE', walletEnvelopeId: '5002' },
      { slug: 'alquileres', name: 'Alquileres', kind: 'EXPENSE', walletEnvelopeId: '5003' },
      { slug: 'seguro-de-vehiculo', name: 'Seguro de vehículo', kind: 'EXPENSE', walletEnvelopeId: '5004' },
      { slug: 'leasing', name: 'Leasing', kind: 'EXPENSE', walletEnvelopeId: '5005' },
    ],
  },
  {
    slug: 'vida-y-entretenimiento',
    name: 'Vida y entretenimiento',
    kind: 'EXPENSE',
    walletEnvelopeId: '6',
    children: [
      { slug: 'atencion-medica-doctor', name: 'Atención médica, doctor', kind: 'EXPENSE', walletEnvelopeId: '6000' },
      { slug: 'bienestar-belleza', name: 'Bienestar, belleza', kind: 'EXPENSE', walletEnvelopeId: '6001' },
      { slug: 'deporte-activo-fitness', name: 'Deporte activo, fitness', kind: 'EXPENSE', walletEnvelopeId: '6002' },
      { slug: 'cultura-eventos-deportivos', name: 'Cultura, eventos deportivos', kind: 'EXPENSE', walletEnvelopeId: '6003' },
      { slug: 'eventos-importantes', name: 'Eventos importantes', kind: 'EXPENSE', walletEnvelopeId: '6004' },
      { slug: 'pasatiempos', name: 'Pasatiempos', kind: 'EXPENSE', walletEnvelopeId: '6005' },
      { slug: 'educacion-desarrollo', name: 'Educación, desarrollo', kind: 'EXPENSE', walletEnvelopeId: '6006' },
      { slug: 'libros-audio-suscripciones', name: 'Libros, audio, suscripciones', kind: 'EXPENSE', walletEnvelopeId: '6007' },
      { slug: 'tv-streaming', name: 'TV, Streaming', kind: 'EXPENSE', walletEnvelopeId: '6008' },
      { slug: 'vacaciones-viajes-hoteles', name: 'Vacaciones, viajes, hoteles', kind: 'EXPENSE', walletEnvelopeId: '6009' },
      { slug: 'caridad-regalos', name: 'Caridad, regalos', kind: 'EXPENSE', walletEnvelopeId: '6010' },
      { slug: 'alcohol-tabaco', name: 'Alcohol, tabaco', kind: 'EXPENSE', walletEnvelopeId: '6011' },
      { slug: 'loteria-juegos-de-azar', name: 'Lotería, juegos de azar', kind: 'EXPENSE', walletEnvelopeId: '6012' },
    ],
  },
  {
    slug: 'comunicacion-pc',
    name: 'Comunicación, PC',
    kind: 'EXPENSE',
    walletEnvelopeId: '7',
    children: [
      { slug: 'telefono-movil', name: 'Teléfono, móvil', kind: 'EXPENSE', walletEnvelopeId: '7001' },
      { slug: 'internet', name: 'Internet', kind: 'EXPENSE', walletEnvelopeId: '7002' },
      { slug: 'software-apps-juegos', name: 'Software, apps, juegos', kind: 'EXPENSE', walletEnvelopeId: '7003' },
      { slug: 'recargas-cop-points', name: 'Recargas COP Points', kind: 'EXPENSE', walletEnvelopeId: '7004' },
    ],
  },
  {
    slug: 'gastos-financieros',
    name: 'Gastos financieros',
    kind: 'EXPENSE',
    walletEnvelopeId: '8',
    children: [
      { slug: 'impuestos', name: 'Impuestos', kind: 'EXPENSE', walletEnvelopeId: '8000' },
      { slug: 'seguros', name: 'Seguros', kind: 'EXPENSE', walletEnvelopeId: '8001' },
      { slug: 'prestamos-intereses', name: 'Préstamos, intereses', kind: 'EXPENSE', walletEnvelopeId: '8002' },
      { slug: 'multas', name: 'Multas', kind: 'EXPENSE', walletEnvelopeId: '8003' },
      { slug: 'asesoria', name: 'Asesoría', kind: 'EXPENSE', walletEnvelopeId: '8004' },
      { slug: 'cargos-comisiones', name: 'Cargos, comisiones', kind: 'EXPENSE', walletEnvelopeId: '8005' },
      { slug: 'manutencion', name: 'Manutención', kind: 'EXPENSE', walletEnvelopeId: '8006' },
    ],
  },
  {
    slug: 'inversiones',
    name: 'Inversiones',
    kind: 'EXPENSE',
    walletEnvelopeId: '9',
    children: [
      { slug: 'realestate', name: 'Bienes raíces', kind: 'EXPENSE', walletEnvelopeId: '9000' },
      { slug: 'vehiculos-bienes-muebles', name: 'Vehículos, bienes muebles', kind: 'EXPENSE', walletEnvelopeId: '9001' },
      { slug: 'inversiones-financieras', name: 'Inversiones financieras', kind: 'EXPENSE', walletEnvelopeId: '9002' },
      { slug: 'ahorros', name: 'Ahorros', kind: 'EXPENSE', walletEnvelopeId: '9003' },
      { slug: 'colecciones', name: 'Colecciones', kind: 'EXPENSE', walletEnvelopeId: '9004' },
    ],
  },
  {
    slug: 'ingresos',
    name: 'Ingresos',
    kind: 'INCOME',
    walletEnvelopeId: '10',
    children: [
      { slug: 'salario-facturas', name: 'Salario, facturas', kind: 'INCOME', walletEnvelopeId: '10000' },
      { slug: 'intereses-dividendos', name: 'Intereses, dividendos', kind: 'INCOME', walletEnvelopeId: '10001' },
      { slug: 'venta', name: 'Venta', kind: 'INCOME', walletEnvelopeId: '10002' },
      { slug: 'ingresos-por-alquiler', name: 'Ingresos por alquiler', kind: 'INCOME', walletEnvelopeId: '10003' },
      { slug: 'cuotas-y-subvenciones', name: 'Cuotas y subvenciones', kind: 'INCOME', walletEnvelopeId: '10004' },
      { slug: 'ingresos-por-prestamo-o-alquiler', name: 'Ingresos por préstamo o alquiler', kind: 'INCOME', walletEnvelopeId: '10005' },
      { slug: 'cheques-cupones', name: 'Cheques, cupones', kind: 'INCOME', walletEnvelopeId: '10006' },
      { slug: 'loteria-juegos-azar-ingreso', name: 'Lotería, juegos de azar', kind: 'INCOME', walletEnvelopeId: '10007' },
      { slug: 'reembolsos', name: 'Reembolsos (impuesto, compra)', kind: 'INCOME', walletEnvelopeId: '10008' },
      { slug: 'manutencion-ingreso', name: 'Manutención', kind: 'INCOME', walletEnvelopeId: '10009' },
      { slug: 'regalos-ingreso', name: 'Regalos', kind: 'INCOME', walletEnvelopeId: '10010' },
      // El export del usuario muestra envelope_id 10011 para "Ingreso" genérico.
      { slug: 'ingreso', name: 'Ingreso', kind: 'INCOME', walletEnvelopeId: '10011' },
    ],
  },
  {
    slug: 'otros',
    name: 'Otros',
    kind: 'BOTH',
    walletEnvelopeId: '11',
    children: [
      { slug: 'otros-genericos', name: 'Otros', kind: 'BOTH', walletEnvelopeId: '11000' },
      { slug: 'faltante', name: 'Faltante', kind: 'BOTH', walletEnvelopeId: '11001' },
    ],
  },
  // Categoría sintética que Wallet usa para transferencias (envelope 20001).
  // Es de SYSTEM y nunca debe ser elegible por el usuario.
  {
    slug: 'transfer',
    name: 'TRANSFER',
    kind: 'TRANSFER',
    walletEnvelopeId: '20001',
  },
]

/** Aplana el árbol con resolución de parentSlug → para iterar al sembrar. */
export function flattenWalletCategoryTree(tree: WalletCategoryNode[] = WALLET_CATEGORY_TREE): Array<{
  slug: string
  name: string
  kind: CategoryKind
  walletEnvelopeId?: string
  parentSlug?: string
  position: number
}> {
  const out: Array<{
    slug: string
    name: string
    kind: CategoryKind
    walletEnvelopeId?: string
    parentSlug?: string
    position: number
  }> = []
  let pos = 0
  for (const root of tree) {
    out.push({ slug: root.slug, name: root.name, kind: root.kind, walletEnvelopeId: root.walletEnvelopeId, position: pos++ })
    for (const child of root.children ?? []) {
      out.push({
        slug: child.slug,
        name: child.name,
        kind: child.kind,
        walletEnvelopeId: child.walletEnvelopeId,
        parentSlug: root.slug,
        position: pos++,
      })
    }
  }
  return out
}
