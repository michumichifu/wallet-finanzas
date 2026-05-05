import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus, Search, Trash2 } from 'lucide-react'
import { Api, type RecordListItem } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { RecordTypeBadge } from '@/components/RecordTypeBadge'
import { NewRecordDrawer } from '@/components/NewRecordDrawer'
import { fmtMoneyByCurrency, fmtUsd } from '@/lib/format'
import { cn } from '@/lib/cn'

type FilterType = '' | 'EXPENSE' | 'INCOME' | 'TRANSFER'

export function RecordsPage() {
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<FilterType>('')
  const [accountId, setAccountId] = useState('')
  const pageSize = 50

  const accountsQ = useQuery({ queryKey: ['accounts'], queryFn: Api.listAccounts })

  const queryKey = useMemo(() => ['records', { page, search, type, accountId, pageSize }], [page, search, type, accountId, pageSize])
  const recordsQ = useQuery({
    queryKey,
    queryFn: () =>
      Api.listRecords({
        page,
        pageSize,
        search: search || undefined,
        type: type || undefined,
        accountId: accountId || undefined,
      }),
  })

  const remove = useMutation({
    mutationFn: Api.deleteRecord,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['records'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
      qc.invalidateQueries({ queryKey: ['dashboard-by-category'] })
    },
  })

  const total = recordsQ.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4 md:p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg md:text-2xl">Registros</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            {total === 0 ? 'Sin registros' : `${total.toLocaleString('en-US')} registros · página ${page} de ${totalPages}`}
          </p>
        </div>
        <Button variant="primary" onClick={() => setDrawerOpen(true)}>
          <Plus />
          Nuevo
        </Button>
      </header>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" strokeWidth={2} />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Buscar en notas o beneficiarios..."
              className="pl-9"
            />
          </div>
          <Select
            value={type}
            onChange={(e) => {
              setType(e.target.value as FilterType)
              setPage(1)
            }}
            className="w-36"
          >
            <option value="">Todos los tipos</option>
            <option value="EXPENSE">Gastos</option>
            <option value="INCOME">Ingresos</option>
            <option value="TRANSFER">Transferencias</option>
          </Select>
          <Select
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value)
              setPage(1)
            }}
            className="w-44"
          >
            <option value="">Todas las cuentas</option>
            {accountsQ.data?.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-subtle/40 text-xs font-medium uppercase tracking-wider text-fg-subtle">
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left">Fecha</th>
                <th className="px-4 py-2.5 text-left">Tipo</th>
                <th className="px-4 py-2.5 text-left">Cuenta</th>
                <th className="px-4 py-2.5 text-left">Categoría</th>
                <th className="px-4 py-2.5 text-left">Nota</th>
                <th className="px-4 py-2.5 text-right">Monto</th>
                <th className="px-4 py-2.5 text-right">USD</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recordsQ.isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3" colSpan={8}>
                        <div className="h-3 w-full animate-pulse rounded bg-bg-muted" />
                      </td>
                    </tr>
                  ))
                : recordsQ.data?.items.length === 0
                  ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-fg-subtle" colSpan={8}>
                        Sin registros que coincidan con los filtros
                      </td>
                    </tr>
                  )
                  : recordsQ.data?.items.map((r) => <RecordRow key={r.id} record={r} onDelete={() => remove.mutate(r.id)} />)
              }
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-xs text-fg-subtle tabular">
            Mostrando {recordsQ.data ? (recordsQ.data.items.length === 0 ? 0 : (page - 1) * pageSize + 1) : '—'}
            {recordsQ.data && recordsQ.data.items.length > 0 ? `–${(page - 1) * pageSize + recordsQ.data.items.length}` : ''}
            {recordsQ.data ? ` de ${total.toLocaleString('en-US')}` : ''}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft />
              Anterior
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Siguiente
              <ChevronRight />
            </Button>
          </div>
        </div>
      </Card>

      <NewRecordDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}

function RecordRow({ record, onDelete }: { record: RecordListItem; onDelete: () => void }) {
  const isExpense = record.type === 'EXPENSE'
  const isIncome = record.type === 'INCOME'
  const dateLabel = new Date(record.occurredAt).toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const timeLabel = new Date(record.occurredAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  const amountSigned = Number(record.amount)

  return (
    <tr className="hover:bg-bg-muted/30">
      <td className="whitespace-nowrap px-4 py-2.5">
        <div className="text-sm text-fg">{dateLabel}</div>
        <div className="text-xs tabular text-fg-subtle">{timeLabel}</div>
      </td>
      <td className="px-4 py-2.5"><RecordTypeBadge type={record.type} /></td>
      <td className="px-4 py-2.5">
        <div className="text-sm text-fg">{record.account.name}</div>
        <div className="text-xs uppercase tracking-wider text-fg-subtle">{record.account.currencyCode}</div>
      </td>
      <td className="px-4 py-2.5">
        {record.category ? (
          <span className="text-sm text-fg">{record.category.name}</span>
        ) : (
          <span className="text-sm text-fg-subtle">—</span>
        )}
      </td>
      <td className="max-w-[280px] px-4 py-2.5">
        <p className="truncate text-sm text-fg-muted" title={record.note ?? ''}>
          {record.note || record.payee || <span className="text-fg-subtle">—</span>}
        </p>
      </td>
      <td className={cn('whitespace-nowrap px-4 py-2.5 text-right text-sm font-medium tabular', isIncome ? 'text-positive' : isExpense ? 'text-negative' : 'text-fg')}>
        {fmtMoneyByCurrency(amountSigned, record.currencyCode)}
      </td>
      <td className={cn('whitespace-nowrap px-4 py-2.5 text-right text-sm font-medium tabular', isIncome ? 'text-positive' : isExpense ? 'text-negative' : 'text-fg-muted')}>
        {fmtUsd(record.amountUsd)}
      </td>
      <td className="px-4 py-2.5 text-right">
        <button
          type="button"
          onClick={() => {
            if (confirm('¿Borrar este registro? Si es transferencia, borra el par completo.')) onDelete()
          }}
          aria-label="Borrar"
          className="inline-flex size-7 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-negative/10 hover:text-negative"
        >
          <Trash2 className="size-3.5" strokeWidth={2} />
        </button>
      </td>
    </tr>
  )
}
