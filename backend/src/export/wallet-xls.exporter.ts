import { Injectable } from '@nestjs/common'
import * as XLSX from 'xlsx'
import { RecordType } from '@prisma/client'
import { PrismaService } from '@/prisma/prisma.service'

/**
 * Exporta records al formato .xls de Wallet by BudgetBakers.
 * El XLS original tiene 2 hojas:
 *   - "Registros": columnas idénticas al CSV. Las fechas se serializan como
 *     número Excel (días desde 1900-01-00) — algunos consumidores lo prefieren.
 *   - "Deudas": estructura distinta, con prestamos al usuario y desde el usuario.
 *     Por ahora la dejamos vacía con encabezado válido (no usamos el feature).
 */

const REGISTROS_HEADER = [
  'account', 'category', 'currency', 'amount', 'ref_currency_amount', 'type',
  'payment_type', 'payment_type_local', 'note', 'date', 'gps_latitude',
  'gps_longitude', 'gps_accuracy_in_meters', 'warranty_in_month', 'transfer',
  'payee', 'labels', 'envelope_id', 'custom_category',
]

const DEUDAS_HEADER = [
  'account', 'type', 'name', 'note', 'amount', 'remaining_amount',
  'creation_date', 'pay_back_date', 'paid_back',
]

const TYPE_TO_ES: Record<RecordType, string> = {
  EXPENSE: 'Gastos',
  INCOME: 'Ingresos',
  TRANSFER: 'Gastos',
}

function dateToExcelSerial(d: Date): number {
  // Excel serial date: días desde 1900-01-00 con bug del año bisiesto preservado.
  const EPOCH = new Date(Date.UTC(1899, 11, 30)).getTime()
  return (d.getTime() - EPOCH) / 86400000
}

@Injectable()
export class WalletXlsExporter {
  constructor(private readonly prisma: PrismaService) {}

  async exportTenant(
    tenantId: string,
    options: { from?: Date; to?: Date } = {},
  ): Promise<{ buffer: Buffer; rowCount: number }> {
    const records = await this.prisma.record.findMany({
      where: {
        tenantId,
        ...(options.from || options.to
          ? {
              occurredAt: {
                ...(options.from ? { gte: options.from } : {}),
                ...(options.to ? { lte: options.to } : {}),
              },
            }
          : {}),
      },
      include: {
        account: { select: { name: true } },
        category: { select: { name: true, walletEnvelopeId: true } },
        labels: { include: { label: { select: { name: true } } } },
      },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    })

    const aoa: (string | number | null)[][] = [REGISTROS_HEADER]
    for (const r of records) {
      const amount = Number(r.amount)
      const refAmount = r.refAmount !== null ? Number(r.refAmount) : 0
      const labels = r.labels.map((l) => l.label.name).join(',')
      const envelopeId = r.category?.walletEnvelopeId ?? (r.isTransfer ? '20001' : '')
      const categoryName = r.category?.name ?? (r.isTransfer ? 'TRANSFER' : '')
      aoa.push([
        r.account.name,
        categoryName,
        r.currencyCode,
        Number(amount.toFixed(2)),
        Number(refAmount.toFixed(2)),
        TYPE_TO_ES[r.type],
        r.paymentType,
        r.paymentTypeLabel ?? 'Efectivo',
        r.note ?? '',
        dateToExcelSerial(r.occurredAt),
        r.gpsLat ?? 0,
        r.gpsLng ?? 0,
        r.gpsAccuracy ?? 0,
        r.warrantyMonths ?? 0,
        r.isTransfer ? 1 : 0,
        r.payee ?? '',
        labels,
        envelopeId,
        0,
      ])
    }

    const wb = XLSX.utils.book_new()
    const wsRegistros = XLSX.utils.aoa_to_sheet(aoa)
    XLSX.utils.book_append_sheet(wb, wsRegistros, 'Registros')

    const wsDeudas = XLSX.utils.aoa_to_sheet([DEUDAS_HEADER])
    XLSX.utils.book_append_sheet(wb, wsDeudas, 'Deudas')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xls' }) as Buffer
    return { buffer, rowCount: records.length }
  }
}
