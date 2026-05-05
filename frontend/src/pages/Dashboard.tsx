import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownRight, ArrowUpRight, Coins, DollarSign, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Api, type AccountListItem, type CategoryBreakdownItem } from '@/lib/api'
import { fmtCount, fmtPercentDelta, fmtUsd } from '@/lib/format'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { AccountCard } from '@/components/AccountCard'
import { DateRangePicker, computeRange, type DateRange } from '@/components/DateRangePicker'
import { cn } from '@/lib/cn'

export function DashboardPage() {
  const [range, setRange] = useState<DateRange>(() => computeRange('this-month'))

  const fromIso = useMemo(() => range.from.toISOString(), [range.from])
  const toIso = useMemo(() => range.to.toISOString(), [range.to])

  const accountsQ = useQuery({ queryKey: ['accounts'], queryFn: Api.listAccounts })
  const summaryQ = useQuery({
    queryKey: ['dashboard-summary', fromIso, toIso],
    queryFn: () => Api.dashboardSummary(fromIso, toIso),
  })
  const breakdownQ = useQuery({
    queryKey: ['dashboard-by-category', fromIso, toIso],
    queryFn: () => Api.dashboardByCategory(fromIso, toIso, 'EXPENSE'),
  })

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg md:text-2xl">Dashboard</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            Periodo: <span className="capitalize text-fg">{range.label}</span>
            <span className="ml-1 text-fg-subtle">· conversiones a USD con tasa P2P real</span>
          </p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </header>

      <AccountsGrid accounts={accountsQ.data ?? []} loading={accountsQ.isLoading} />

      <KpiRow summary={summaryQ.data} loading={summaryQ.isLoading} />

      <BreakdownCard items={breakdownQ.data ?? []} loading={breakdownQ.isLoading} />
    </div>
  )
}

function AccountsGrid({ accounts, loading }: { accounts: AccountListItem[]; loading: boolean }) {
  const visible = accounts.filter((a) => !a.isArchived)
  return (
    <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {loading
        ? Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-[68px] animate-pulse rounded-lg bg-bg-muted" />
          ))
        : visible.map((a) => <AccountCard key={a.id} account={a} to={`/cuentas/${a.id}`} />)}
      <Link
        to="/cuentas"
        className={cn(
          'flex h-[68px] items-center justify-center gap-1.5 rounded-lg border border-dashed border-border',
          'text-xs font-medium uppercase tracking-wider text-fg-muted',
          'hover:border-accent hover:text-accent transition-colors',
        )}
      >
        <Plus className="size-3.5" strokeWidth={2} />
        Agregar cuenta
      </Link>
    </section>
  )
}

function KpiRow({
  summary,
  loading,
}: {
  summary: import('@/lib/api').DashboardSummary | undefined
  loading: boolean
}) {
  const t = summary?.totals
  const p = summary?.previousPeriod

  const incomeDelta = t && p ? fmtPercentDelta(t.incomeUsd, p.incomeUsd) : null
  const expenseDelta = t && p ? fmtPercentDelta(t.expenseUsd, p.expenseUsd) : null
  const netDelta = t && p ? fmtPercentDelta(t.netUsd, p.netUsd) : null

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Ingreso"
        value={fmtUsd(t?.incomeUsd ?? null)}
        delta={incomeDelta}
        icon={<ArrowUpRight className="size-4" strokeWidth={2} />}
        accent="positive"
        loading={loading}
      />
      <KpiCard
        label="Gasto"
        value={fmtUsd(t?.expenseUsd ?? null)}
        delta={expenseDelta}
        icon={<ArrowDownRight className="size-4" strokeWidth={2} />}
        accent="negative"
        invertedDelta
        loading={loading}
      />
      <KpiCard
        label="Flujo neto"
        value={fmtUsd(t?.netUsd ?? null)}
        delta={netDelta}
        icon={<DollarSign className="size-4" strokeWidth={2} />}
        accent={t && t.netUsd >= 0 ? 'positive' : 'negative'}
        loading={loading}
      />
      <KpiCard
        label="Transacciones"
        value={fmtCount(t?.transactionCount)}
        delta={null}
        icon={<Coins className="size-4" strokeWidth={2} />}
        accent="neutral"
        loading={loading}
      />
    </div>
  )
}

function KpiCard({
  label,
  value,
  delta,
  icon,
  accent,
  invertedDelta,
  loading,
}: {
  label: string
  value: string
  delta: { text: string; sign: 1 | 0 | -1 } | null
  icon: React.ReactNode
  accent: 'positive' | 'negative' | 'neutral'
  invertedDelta?: boolean
  loading: boolean
}) {
  const accentRing = accent === 'positive' ? 'ring-positive/30 text-positive' : accent === 'negative' ? 'ring-negative/30 text-negative' : 'ring-border text-fg-muted'
  const deltaClass = !delta
    ? 'text-fg-subtle'
    : (invertedDelta ? -delta.sign : delta.sign) > 0
      ? 'text-positive'
      : (invertedDelta ? -delta.sign : delta.sign) < 0
        ? 'text-negative'
        : 'text-fg-subtle'

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">{label}</p>
          <p className={cn('mt-1.5 text-2xl font-semibold tabular tracking-tight', loading ? 'text-fg-subtle' : 'text-fg')}>
            {loading ? '—' : value}
          </p>
          {delta ? (
            <p className={cn('mt-1 text-xs font-medium tabular', deltaClass)}>
              {delta.text} <span className="text-fg-subtle">vs periodo anterior</span>
            </p>
          ) : (
            <p className="mt-1 text-xs text-fg-subtle">&nbsp;</p>
          )}
        </div>
        <div className={cn('flex size-9 items-center justify-center rounded-lg ring-1', accentRing)}>{icon}</div>
      </div>
    </Card>
  )
}

function BreakdownCard({ items, loading }: { items: CategoryBreakdownItem[]; loading: boolean }) {
  const top = items.slice(0, 8)
  const max = top.reduce((m, i) => Math.max(m, i.totalUsd), 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle hint="Top 8 — gastos del periodo">Por categoría</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-3 w-24 animate-pulse rounded bg-bg-muted" />
                  <div className="h-3 w-12 animate-pulse rounded bg-bg-muted" />
                </div>
                <div className="h-1.5 w-full animate-pulse rounded bg-bg-muted" />
              </div>
            ))
          : top.length === 0
            ? <p className="text-center text-sm text-fg-subtle">Sin datos en el periodo</p>
            : top.map((item) => (
                <div key={item.categoryId ?? item.name} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm text-fg">{item.name}</span>
                    <span className="shrink-0 text-sm font-medium tabular text-fg">{fmtUsd(item.totalUsd)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-muted">
                    <div
                      className="h-full rounded-full bg-accent/80"
                      style={{ width: `${max > 0 ? (item.totalUsd / max) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
      </CardBody>
    </Card>
  )
}
