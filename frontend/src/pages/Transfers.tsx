import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { Api, type TransferPairView } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { RecordDrawer } from '@/components/RecordDrawer'
import { fmtMoneyByCurrency, fmtNumber, fmtUsd } from '@/lib/format'

const RATE_SOURCE_LABEL: Record<string, string> = {
  MANUAL: 'manual',
  BINANCE_P2P: 'P2P Binance',
  COINGECKO: 'CoinGecko',
  COINMARKETCAP: 'CoinMarketCap',
  IMPORTED: 'importada',
  INFERRED_FROM_TRANSFER: 'P2P inferida',
  BCV: 'BCV',
}

export function TransfersPage() {
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 30

  const transfersQ = useQuery({
    queryKey: ['transfers', { page, pageSize }],
    queryFn: () => Api.listTransfers({ page, pageSize }),
  })

  const remove = useMutation({
    mutationFn: Api.deleteRecord,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] })
      qc.invalidateQueries({ queryKey: ['records'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
  })

  const total = transfersQ.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4 md:p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg md:text-2xl">Transferencias</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            {total === 0 ? 'Sin transferencias' : `${total.toLocaleString('en-US')} transferencias · página ${page} de ${totalPages}`}
          </p>
        </div>
        <Button variant="primary" onClick={() => setDrawerOpen(true)}><Plus />Nueva</Button>
      </header>

      {transfersQ.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><div className="h-16 animate-pulse rounded bg-bg-muted/50" /></Card>
          ))}
        </div>
      ) : transfersQ.data?.items.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-10">
            <ArrowRight className="size-6 text-fg-subtle" strokeWidth={1.75} />
            <p className="text-sm text-fg-muted">Sin transferencias en este periodo.</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-2">
          {transfersQ.data?.items.map((t) => (
            <TransferRow key={t.id} pair={t} onDelete={() => remove.mutate(t.from.recordId)} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-3">
        <p className="text-xs text-fg-subtle tabular">
          {transfersQ.data?.items.length ? `${(page - 1) * pageSize + 1}–${(page - 1) * pageSize + transfersQ.data.items.length}` : '—'}
          {transfersQ.data ? ` de ${total.toLocaleString('en-US')}` : ''}
        </p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            <ChevronLeft />Anterior
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
            Siguiente<ChevronRight />
          </Button>
        </div>
      </div>

      <RecordDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}

function TransferRow({ pair, onDelete }: { pair: TransferPairView; onDelete: () => void }) {
  const date = new Date(pair.occurredAt).toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const time = new Date(pair.occurredAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  const sameCurrency = pair.from.account.currencyCode === pair.to.account.currencyCode
  const rate = pair.appliedRate ? Number(pair.appliedRate) : null

  return (
    <Card className="px-5 py-3.5">
      <div className="flex items-center gap-4">
        <div className="min-w-[100px] shrink-0">
          <p className="text-sm text-fg">{date}</p>
          <p className="text-xs tabular text-fg-subtle">{time}</p>
        </div>

        <div className="flex flex-1 items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{pair.from.account.name}</p>
            <p className="text-sm font-medium tabular text-negative">
              {fmtMoneyByCurrency(pair.from.amount, pair.from.account.currencyCode)}
              <span className="ml-2 text-xs text-fg-subtle">{fmtUsd(pair.from.amountUsd)}</span>
            </p>
          </div>

          <ArrowRight className="size-4 shrink-0 text-fg-subtle" strokeWidth={2} />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{pair.to.account.name}</p>
            <p className="text-sm font-medium tabular text-positive">
              {fmtMoneyByCurrency(pair.to.amount, pair.to.account.currencyCode)}
              <span className="ml-2 text-xs text-fg-subtle">{fmtUsd(pair.to.amountUsd)}</span>
            </p>
          </div>
        </div>

        <div className="hidden flex-col items-end shrink-0 sm:flex min-w-[120px]">
          {!sameCurrency && rate ? (
            <>
              <p className="text-xs font-medium tabular text-fg">
                {fmtNumber(rate, 2)} <span className="text-fg-subtle">{pair.to.account.currencyCode}/{pair.from.account.currencyCode}</span>
              </p>
              <p className="text-[10px] uppercase tracking-wider text-fg-subtle">{RATE_SOURCE_LABEL[pair.rateSource ?? ''] ?? pair.rateSource}</p>
            </>
          ) : (
            <p className="text-[10px] uppercase tracking-wider text-fg-subtle">misma moneda</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            if (confirm('¿Borrar esta transferencia? Borra el par completo (ambas legs).')) onDelete()
          }}
          aria-label="Borrar"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-fg-subtle hover:bg-negative/10 hover:text-negative"
        >
          <Trash2 className="size-3.5" strokeWidth={2} />
        </button>
      </div>
      {pair.notes ? (
        <p className="mt-1 truncate text-xs text-fg-muted">{pair.notes}</p>
      ) : null}
    </Card>
  )
}
