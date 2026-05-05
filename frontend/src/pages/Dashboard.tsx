import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownRight, ArrowUpRight, Bitcoin, Coins, DollarSign, Wallet, Banknote } from 'lucide-react'
import { Api, type AccountListItem, type CategoryBreakdownItem } from '@/lib/api'
import { fmtCount, fmtMoneyByCurrency, fmtPercentDelta, fmtUsd } from '@/lib/format'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn } from '@/lib/cn'

function getMonthRange(): { from: string; to: string; label: string } {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const label = from.toLocaleDateString('es', { month: 'long', year: 'numeric' })
  return { from: from.toISOString(), to: to.toISOString(), label }
}

export function DashboardPage() {
  const { from, to, label } = useMemo(() => getMonthRange(), [])

  const accountsQ = useQuery({ queryKey: ['accounts'], queryFn: Api.listAccounts })
  const summaryQ = useQuery({
    queryKey: ['dashboard-summary', from, to],
    queryFn: () => Api.dashboardSummary(from, to),
  })
  const breakdownQ = useQuery({
    queryKey: ['dashboard-by-category', from, to],
    queryFn: () => Api.dashboardByCategory(from, to, 'EXPENSE'),
  })

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg md:text-2xl">Dashboard</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            Resumen del periodo: <span className="capitalize text-fg">{label}</span>
            <span className="ml-1 text-fg-subtle">· conversiones a USD con tasa P2P real</span>
          </p>
        </div>
      </header>

      <KpiRow summary={summaryQ.data} loading={summaryQ.isLoading} />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AccountsCard accounts={accountsQ.data ?? []} loading={accountsQ.isLoading} />
        </div>
        <BreakdownCard items={breakdownQ.data ?? []} loading={breakdownQ.isLoading} />
      </section>
    </div>
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

function AccountsCard({ accounts, loading }: { accounts: AccountListItem[]; loading: boolean }) {
  const totalUsd = accounts
    .filter((a) => !a.excludeFromTotals)
    .reduce((sum, a) => sum + (a.balanceUsd ?? 0), 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle hint="Saldos actuales por cuenta — equivalencia USD con tasa P2P real">Cuentas</CardTitle>
        <p className="text-sm font-semibold tabular text-fg">{fmtUsd(totalUsd)}</p>
      </CardHeader>
      <CardBody className="p-0">
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="divide-y divide-border">
            {(loading ? Array.from({ length: 7 }) : accounts.slice(0, Math.ceil(accounts.length / 2))).map(
              (a, i) => (loading ? <AccountRowSkeleton key={i} /> : a ? <AccountRow key={(a as AccountListItem).id} account={a as AccountListItem} /> : null),
            )}
          </div>
          <div className="divide-y divide-border">
            {(loading ? Array.from({ length: 7 }) : accounts.slice(Math.ceil(accounts.length / 2))).map(
              (a, i) => (loading ? <AccountRowSkeleton key={i} /> : a ? <AccountRow key={(a as AccountListItem).id} account={a as AccountListItem} /> : null),
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function AccountRow({ account }: { account: AccountListItem }) {
  const isCrypto = account.type === 'CRYPTO'
  const isCash = account.type === 'CASH'
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg ring-1',
          isCrypto ? 'bg-warning/10 ring-warning/30 text-warning' : isCash ? 'bg-bg-muted ring-border text-fg-muted' : 'bg-accent/10 ring-accent/30 text-accent',
        )}
      >
        {isCrypto ? <Bitcoin className="size-4" strokeWidth={2} /> : isCash ? <Banknote className="size-4" strokeWidth={2} /> : <Wallet className="size-4" strokeWidth={2} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{account.name}</p>
        <p className="text-xs text-fg-subtle tabular">{fmtMoneyByCurrency(account.balance, account.currencyCode)}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium tabular text-fg">{fmtUsd(account.balanceUsd)}</p>
      </div>
    </div>
  )
}

function AccountRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <div className="size-9 shrink-0 animate-pulse rounded-lg bg-bg-muted" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-32 animate-pulse rounded bg-bg-muted" />
        <div className="h-2.5 w-20 animate-pulse rounded bg-bg-muted" />
      </div>
      <div className="h-3 w-16 animate-pulse rounded bg-bg-muted" />
    </div>
  )
}

function BreakdownCard({ items, loading }: { items: CategoryBreakdownItem[]; loading: boolean }) {
  const top = items.slice(0, 8)
  const max = top.reduce((m, i) => Math.max(m, i.totalUsd), 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle hint="Top 8 — gastos del mes">Por categoría</CardTitle>
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
