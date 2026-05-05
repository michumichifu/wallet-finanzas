import { Injectable } from '@nestjs/common'
import { RecordType } from '@prisma/client'
import { PrismaService } from '@/prisma/prisma.service'

/**
 * Exporta records a CSV con el formato exacto de Wallet by BudgetBakers,
 * lo que permite re-importar la data al cliente original o a herramientas
 * que ya entienden ese formato.
 *
 * Formato CSV Wallet:
 *   - Separador: `;`
 *   - Encoding: UTF-8 con BOM
 *   - Header: account;category;currency;amount;ref_currency_amount;type;
 *             payment_type;payment_type_local;note;date;gps_latitude;
 *             gps_longitude;gps_accuracy_in_meters;warranty_in_month;
 *             transfer;payee;labels;envelope_id;custom_category
 *   - type: "Gastos" / "Ingresos" (en español)
 *   - transfer: "true" / "false"
 *   - date: "YYYY-MM-DD HH:mm:ss"
 *   - envelope_id: id interno de Wallet de la categoría (preservado en walletEnvelopeId)
 */

const CSV_HEADER = [
  'account',
  'category',
  'currency',
  'amount',
  'ref_currency_amount',
  'type',
  'payment_type',
  'payment_type_local',
  'note',
  'date',
  'gps_latitude',
  'gps_longitude',
  'gps_accuracy_in_meters',
  'warranty_in_month',
  'transfer',
  'payee',
  'labels',
  'envelope_id',
  'custom_category',
].join(';')

function escapeCsv(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  // Reemplaza separadores que romperían el CSV. No usamos quotes para
  // preservar fidelidad con el export original de Wallet.
  return String(value).replace(/[;\r\n]/g, ' ')
}

function formatDate(d: Date): string {
  // "YYYY-MM-DD HH:mm:ss" en hora local del servidor.
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatNumber(value: number): string {
  // Wallet usa punto decimal y sin separador de miles.
  if (!Number.isFinite(value)) return '0.00'
  return value.toFixed(2)
}

const TYPE_TO_ES: Record<RecordType, string> = {
  EXPENSE: 'Gastos',
  INCOME: 'Ingresos',
  TRANSFER: 'Gastos', // Wallet pone ambas legs como "Gastos" porque la dirección la indica el signo.
}

@Injectable()
export class WalletCsvExporter {
  constructor(private readonly prisma: PrismaService) {}

  async exportTenant(
    tenantId: string,
    options: { from?: Date; to?: Date } = {},
  ): Promise<{ content: string; rowCount: number; refCurrencyCode: string }> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) throw new Error(`Tenant ${tenantId} no existe`)

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
        category: { select: { name: true, walletEnvelopeId: true, slug: true } },
        labels: { include: { label: { select: { name: true } } } },
      },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    })

    const lines: string[] = [CSV_HEADER]
    for (const r of records) {
      const amount = Number(r.amount)
      const refAmount = r.refAmount !== null ? Number(r.refAmount) : 0
      const labels = r.labels.map((l) => l.label.name).join(',')
      const envelopeId = r.category?.walletEnvelopeId ?? (r.isTransfer ? '20001' : '')
      const categoryName = r.category?.name ?? (r.isTransfer ? 'TRANSFER' : '')

      lines.push(
        [
          escapeCsv(r.account.name),
          escapeCsv(categoryName),
          escapeCsv(r.currencyCode),
          formatNumber(amount),
          formatNumber(refAmount),
          TYPE_TO_ES[r.type],
          r.paymentType,
          escapeCsv(r.paymentTypeLabel ?? 'Efectivo'),
          escapeCsv(r.note ?? ''),
          formatDate(r.occurredAt),
          r.gpsLat !== null ? String(r.gpsLat) : '',
          r.gpsLng !== null ? String(r.gpsLng) : '',
          r.gpsAccuracy !== null ? String(r.gpsAccuracy) : '',
          String(r.warrantyMonths ?? 0),
          r.isTransfer ? 'true' : 'false',
          escapeCsv(r.payee ?? ''),
          escapeCsv(labels),
          envelopeId,
          'false',
        ].join(';'),
      )
    }

    return {
      content: '﻿' + lines.join('\n') + '\n',
      rowCount: records.length,
      refCurrencyCode: tenant.refCurrencyCode,
    }
  }
}
