import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronDown, Edit2, Trash2 } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Api, type RecordListItem } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { resolveLucideIcon } from '@/components/AccountCard'
import { AccountDrawer } from '@/components/AccountDrawer'
import { RecordDrawer } from '@/components/RecordDrawer'
import { RecordTypeBadge } from '@/components/RecordTypeBadge'
import { DateRangePicker, computeRange, type DateRange } from '@/components/DateRangePicker'
import { fmtMoneyByCurrency, fmtPercentDelta, fmtUsd } from '@/lib/format'
import { cn } from '@/lib/cn'

type Tab = 'balance' | 'records'

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('balance')
  const [editing, setEditing] = useState(false)
  const [editingRecord, setEditingRecord] = useState<RecordListItem | null>(null)
  const [range, setRange] = useState<DateRange>(() => computeRange('this-month'))

  const accountQ = useQuery({
    queryKey: ['account', id],
    queryFn: () => Api.getAccount(id!),
    enabled: !!id,
  })

  const fromIso = useMemo(() => range.from.toISOString(), [range.from])
  const toIso = useMemo(() => range.to.toISOString(), [range.to])

  const historyQ = useQuery({
    queryKey: ['account-balance-history', id, fromIso, toIso],
    queryFn: () => Api.accountBalanceHistory(id!, fromIso, toIso),
    enabled: !!id && tab === 'balance',
  })

  const recordsQ = useQuery({
    queryKey: ['records', { accountId: id, fromIso, toIso, page: 1 }],
    queryFn: () => Api.listRecords({ accountId: id, from: fromIso, to: toIso, pageSize: 200 }),
    enabled: !!id && tab === 'records',
  })

  const archive = useMutation({
    mutationFn: () => Api.archiveAccount(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      navigate('/cuentas')
    },
  })

  if (!id) return null
  if (accountQ.isLoading) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4 md:p-6">
        <div className="h-12 animate-pulse rounded-lg bg-bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-bg-muted" />
      </div>
    )
  }
  if (!accountQ.data) {
    return (
      <div className="p-6 text-center text-sm text-fg-subtle">
        Cuenta no encontrada. <Link to="/cuentas" className="text-accent hover:underline">Volver</Link>
      </div>
    )
  }

  const account = accountQ.data
  const Icon = resolveLucideIcon(account.iconKey)
  const points = historyQ.data?.points ?? []
  const last = points.at(-1)
  const first = points[0]
  const delta = last && first ? fmtPercentDelta(last.balanceUsd ?? 0, first.balanceUsd ?? 0) : null

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4 md:p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/cuentas" aria-label="Volver" className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-bg-muted hover:text-fg">
            <ArrowLeft className="size-4" strokeWidth={2} />
          </Link>
          <h1 className="truncate text-xl font-semibold tracking-tight text-fg md:text-2xl">{account.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setEditing(true)}><Edit2 />Editar</Button>
          <Button variant="destructive" onClick={() => {
            if (confirm(`¿Archivar la cuenta "${account.name}"? Sus registros se preservan; la cuenta deja de aparecer en pantallas. Para borrar definitivamente debes vaciarla.`)) {
              archive.mutate()
            }
          }}><Trash2 />Archivar</Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: account.color ?? 'var(--color-bg-muted)' }}
          >
            {account.photoUrl ? (
              <img src={account.photoUrl} alt="" className="size-14 rounded-xl object-cover" />
            ) : (
              <Icon className="size-7" strokeWidth={2} style={{ color: account.iconColor ?? '#ffffff' }} />
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-fg-subtle">Tipo</p>
            <p className="text-sm font-medium text-fg">{accountTypeLabel(account.type)}{account.bankName ? ` · ${account.bankName}` : ''}</p>
          </div>
        </div>
      </div>

      <div className="flex border-b border-border">
        {(['balance', 'records'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors',
              tab === t ? 'text-fg' : 'text-fg-muted hover:text-fg',
            )}
          >
            {t === 'balance' ? 'Saldo' : 'Registros'}
            {tab === t ? <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" /> : null}
          </button>
        ))}
        <div className="ml-auto py-1.5">
          <DateRangePicker value={range} onChange={setRange} />
        </div>
      </div>

      {tab === 'balance' ? (
        <BalanceTab account={account} points={points} delta={delta} />
      ) : (
        <RecordsTab
          loading={recordsQ.isLoading}
          items={recordsQ.data?.items ?? []}
          onEditRecord={setEditingRecord}
        />
      )}

      <AccountDrawer open={editing} onClose={() => setEditing(false)} account={account} />
      <RecordDrawer open={!!editingRecord} onClose={() => setEditingRecord(null)} record={editingRecord} />
    </div>
  )
}

function BalanceTab({
  account,
  points,
  delta,
}: {
  account: import('@/lib/api').AccountListItem
  points: import('@/lib/api').BalanceHistoryPoint[]
  delta: { text: string; sign: 1 | 0 | -1 } | null
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle hint="Saldo equivalente USD con tasa P2P real al final de cada día">Saldo</CardTitle>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular text-fg">{fmtMoneyByCurrency(account.balance, account.currencyCode)}</p>
          {account.currencyCode !== 'USD' && account.currencyCode !== 'USDT' && account.currencyCode !== 'USDC' ? (
            <p className="text-xs text-fg-subtle tabular">{fmtUsd(account.balanceUsd)}</p>
          ) : null}
          {delta && delta.sign !== 0 ? (
            <p className={cn('mt-1 text-xs font-medium tabular', delta.sign > 0 ? 'text-positive' : 'text-negative')}>
              <ChevronDown className={cn('inline size-3', delta.sign > 0 ? 'rotate-180' : '')} strokeWidth={2.5} />
              {delta.text} <span className="text-fg-subtle">vs inicio del periodo</span>
            </p>
          ) : null}
        </div>
      </CardHeader>
      <CardBody>
        {points.length === 0 ? (
          <p className="py-12 text-center text-sm text-fg-subtle">Sin movimientos en el periodo.</p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(70% 0.16 248)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="oklch(70% 0.16 248)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(s) => new Date(s + 'T00:00:00').toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                  className="fill-fg-subtle text-[10px]"
                  minTickGap={32}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={70}
                  tickFormatter={(n: number) => `$${Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0)}`}
                  className="fill-fg-subtle text-[10px]"
                />
                <Tooltip
                  cursor={{ stroke: 'oklch(58% 0.16 248)', strokeWidth: 1, strokeDasharray: '3 3' }}
                  contentStyle={{
                    background: 'var(--color-bg-subtle)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(s) => typeof s === 'string' ? new Date(s + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Saldo USD'] as [string, string]}
                />
                <Area
                  type="monotone"
                  dataKey="balanceUsd"
                  stroke="oklch(58% 0.16 248)"
                  strokeWidth={2}
                  fill="url(#balanceFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function RecordsTab({
  loading,
  items,
  onEditRecord,
}: {
  loading: boolean
  items: RecordListItem[]
  onEditRecord: (r: RecordListItem) => void
}) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-subtle/40 text-xs font-medium uppercase tracking-wider text-fg-subtle">
            <tr className="border-b border-border">
              <th className="px-4 py-2.5 text-left">Fecha</th>
              <th className="px-4 py-2.5 text-left">Tipo</th>
              <th className="px-4 py-2.5 text-left">Categoría</th>
              <th className="px-4 py-2.5 text-left">Nota</th>
              <th className="px-4 py-2.5 text-right">Monto</th>
              <th className="px-4 py-2.5 text-right">USD</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3" colSpan={7}>
                    <div className="h-3 w-full animate-pulse rounded bg-bg-muted" />
                  </td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-fg-subtle" colSpan={7}>
                  Sin movimientos en el periodo.
                </td>
              </tr>
            ) : (
              items.map((r) => {
                const date = new Date(r.occurredAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
                const time = new Date(r.occurredAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
                const isExpense = r.type === 'EXPENSE'
                const isIncome = r.type === 'INCOME'
                return (
                  <tr key={r.id} className="hover:bg-bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <div className="text-sm text-fg">{date}</div>
                      <div className="text-xs tabular text-fg-subtle">{time}</div>
                    </td>
                    <td className="px-4 py-2.5"><RecordTypeBadge type={r.type} /></td>
                    <td className="px-4 py-2.5">
                      {r.category ? <span className="text-sm text-fg">{r.category.name}</span> : <span className="text-sm text-fg-subtle">—</span>}
                    </td>
                    <td className="max-w-[260px] px-4 py-2.5">
                      <p className="truncate text-sm text-fg-muted" title={r.note ?? ''}>{r.note || r.payee || <span className="text-fg-subtle">—</span>}</p>
                    </td>
                    <td className={cn('whitespace-nowrap px-4 py-2.5 text-right text-sm font-medium tabular',
                      isIncome ? 'text-positive' : isExpense ? 'text-negative' : 'text-fg')}>
                      {fmtMoneyByCurrency(Number(r.amount), r.currencyCode)}
                    </td>
                    <td className={cn('whitespace-nowrap px-4 py-2.5 text-right text-sm font-medium tabular',
                      isIncome ? 'text-positive' : isExpense ? 'text-negative' : 'text-fg-muted')}>
                      {fmtUsd(r.amountUsd)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      {!r.isTransfer ? (
                        <button
                          type="button"
                          onClick={() => onEditRecord(r)}
                          aria-label="Editar"
                          className="inline-flex size-7 items-center justify-center rounded-md text-fg-subtle hover:bg-bg-muted hover:text-fg"
                        >
                          <Edit2 className="size-3.5" strokeWidth={2} />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function accountTypeLabel(type: string): string {
  const map: Record<string, string> = {
    GENERAL: 'Cuenta general',
    CASH: 'Efectivo',
    SAVINGS: 'Cuenta de ahorros',
    CHECKING: 'Cuenta corriente',
    CREDIT_CARD: 'Tarjeta de crédito',
    DEBIT_CARD: 'Tarjeta de débito',
    INVESTMENT: 'Inversión',
    CRYPTO: 'Cripto',
    CRYPTO_EXCHANGE: 'Cripto exchange',
    CRYPTO_WALLET: 'Cripto wallet',
    LOAN: 'Préstamo',
    MORTGAGE: 'Hipoteca',
    BOND: 'Bono',
    LIFE_INSURANCE: 'Seguro de vida',
    OVERDRAFT: 'Sobregiro',
    OTHER: 'Otro',
  }
  return map[type] ?? type
}
