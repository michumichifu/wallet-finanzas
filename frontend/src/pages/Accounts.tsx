import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Api, type AccountListItem } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { AccountCard } from '@/components/AccountCard'
import { AccountDrawer } from '@/components/AccountDrawer'
import { fmtUsd } from '@/lib/format'

export function AccountsPage() {
  const accountsQ = useQuery({ queryKey: ['accounts'], queryFn: Api.listAccounts })
  const [editing, setEditing] = useState<AccountListItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const all = accountsQ.data ?? []
  const visible = showArchived ? all : all.filter((a) => !a.isArchived)
  const total = all
    .filter((a) => !a.excludeFromTotals && !a.isArchived)
    .reduce((s, a) => s + (a.balanceUsd ?? 0), 0)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg md:text-2xl">Cuentas</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            {visible.length} cuentas · total <span className="tabular text-fg">{fmtUsd(total)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-fg-muted">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="size-3.5 cursor-pointer accent-accent" />
            mostrar archivadas
          </label>
          <Button variant="primary" onClick={() => setCreating(true)}><Plus />Nueva cuenta</Button>
        </div>
      </header>

      {accountsQ.isLoading ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-[68px] animate-pulse rounded-lg bg-bg-muted" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16">
          <p className="text-sm text-fg-muted">Sin cuentas todavía.</p>
          <Button variant="primary" onClick={() => setCreating(true)}><Plus />Crear primera cuenta</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {visible.map((a) => (
            <AccountCard key={a.id} account={a} to={`/cuentas/${a.id}`} />
          ))}
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex h-[68px] items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-xs font-medium uppercase tracking-wider text-fg-muted hover:border-accent hover:text-accent transition-colors"
          >
            <Plus className="size-3.5" strokeWidth={2} />
            Agregar cuenta
          </button>
        </div>
      )}

      <AccountDrawer
        open={!!editing || creating}
        onClose={() => {
          setEditing(null)
          setCreating(false)
        }}
        account={editing}
      />
    </div>
  )
}
