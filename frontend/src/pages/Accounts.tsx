import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Banknote, Bitcoin, Edit2, Wallet } from 'lucide-react'
import { Api, type AccountListItem } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { FieldLabel, Input, Select } from '@/components/ui/Input'
import { fmtMoneyByCurrency, fmtUsd } from '@/lib/format'
import { cn } from '@/lib/cn'

const COMMON_CURRENCIES = ['USD', 'VES', 'DOP', 'COP', 'EUR', 'BRL', 'ARS', 'MXN', 'PEN', 'USDT', 'USDC', 'BTC', 'ETH', 'SOL']
const ACCOUNT_TYPES = ['GENERAL', 'CASH', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'CRYPTO', 'LOAN', 'OTHER']

export function AccountsPage() {
  const accountsQ = useQuery({ queryKey: ['accounts'], queryFn: Api.listAccounts })
  const [editing, setEditing] = useState<AccountListItem | null>(null)
  const [creating, setCreating] = useState(false)

  const total = (accountsQ.data ?? [])
    .filter((a) => !a.excludeFromTotals && !a.isArchived)
    .reduce((s, a) => s + (a.balanceUsd ?? 0), 0)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4 md:p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg md:text-2xl">Cuentas</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            {accountsQ.data?.length ?? 0} cuentas · total <span className="tabular text-fg">{fmtUsd(total)}</span>
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}>Nueva cuenta</Button>
      </header>

      <Card>
        <div className="divide-y divide-border">
          {(accountsQ.data ?? []).map((a) => (
            <AccountRow key={a.id} account={a} onEdit={() => setEditing(a)} />
          ))}
          {accountsQ.isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-bg-muted" />
                </div>
              ))
            : null}
        </div>
      </Card>

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

function AccountRow({ account, onEdit }: { account: AccountListItem; onEdit: () => void }) {
  const isCrypto = account.type === 'CRYPTO'
  const isCash = account.type === 'CASH'
  const Icon = isCrypto ? Bitcoin : isCash ? Banknote : Wallet
  const tone = isCrypto ? 'text-warning bg-warning/10 ring-warning/30' : isCash ? 'text-fg-muted bg-bg-muted ring-border' : 'text-accent bg-accent/10 ring-accent/30'

  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg ring-1', tone)}>
        <Icon className="size-4" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-fg">{account.name}</p>
          <span className="rounded-md bg-bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
            {account.type}
          </span>
          {account.isArchived ? (
            <span className="rounded-md bg-bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">archivada</span>
          ) : null}
        </div>
        <p className="text-xs tabular text-fg-subtle">{fmtMoneyByCurrency(account.balance, account.currencyCode)}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium tabular text-fg">{fmtUsd(account.balanceUsd)}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label="Editar"
        className="inline-flex size-8 items-center justify-center rounded-md text-fg-muted hover:bg-bg-muted hover:text-fg"
      >
        <Edit2 className="size-3.5" strokeWidth={2} />
      </button>
    </div>
  )
}

function AccountDrawer({
  open,
  onClose,
  account,
}: {
  open: boolean
  onClose: () => void
  account: AccountListItem | null
}) {
  const qc = useQueryClient()
  const isEdit = !!account

  const [name, setName] = useState('')
  const [currencyCode, setCurrencyCode] = useState('USD')
  const [type, setType] = useState('GENERAL')
  const [error, setError] = useState<string | null>(null)
  const [propagateCurrency, setPropagateCurrency] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(account?.name ?? '')
    setCurrencyCode(account?.currencyCode ?? 'USD')
    setType(account?.type ?? 'GENERAL')
    setError(null)
    setPropagateCurrency(false)
  }, [open, account?.id, account?.name, account?.currencyCode, account?.type])

  const create = useMutation({
    mutationFn: Api.createAccount,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      onClose()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string | string[] } } }
      const m = e.response?.data?.message
      setError(Array.isArray(m) ? m.join(', ') : (m ?? 'Error al guardar'))
    },
  })

  const patch = useMutation({
    mutationFn: (payload: Parameters<typeof Api.patchAccount>[1]) => Api.patchAccount(account!.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      onClose()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string | string[] } } }
      const m = e.response?.data?.message
      setError(Array.isArray(m) ? m.join(', ') : (m ?? 'Error al guardar'))
    },
  })

  const fixCurrency = useMutation({
    mutationFn: (newCurrency: string) => Api.fixAccountCurrency(account!.id, newCurrency),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['records'] })
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
      onClose()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string | string[] } } }
      const m = e.response?.data?.message
      setError(Array.isArray(m) ? m.join(', ') : (m ?? 'Error al guardar'))
    },
  })

  const submitting = create.isPending || patch.isPending || fixCurrency.isPending

  function submit() {
    setError(null)
    if (!name.trim()) return setError('Nombre requerido')

    if (!isEdit) {
      create.mutate({ name: name.trim(), currencyCode, type })
      return
    }

    if (propagateCurrency && currencyCode !== account!.currencyCode) {
      fixCurrency.mutate(currencyCode)
      return
    }

    const payload: Parameters<typeof Api.patchAccount>[1] = {}
    if (name.trim() !== account!.name) payload.name = name.trim()
    if (currencyCode !== account!.currencyCode) payload.currencyCode = currencyCode
    if (type !== account!.type) payload.type = type
    if (Object.keys(payload).length === 0) {
      onClose()
      return
    }
    patch.mutate(payload)
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? `Editar cuenta` : 'Nueva cuenta'}
      description={isEdit ? account!.name : 'Define dónde guardas o mueves tu dinero'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FieldLabel>
          Nombre
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: BDV USD" />
        </FieldLabel>

        <FieldLabel>
          Moneda
          <Select value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)}>
            {COMMON_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </FieldLabel>

        <FieldLabel>
          Tipo
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </FieldLabel>

        {isEdit && currencyCode !== account!.currencyCode ? (
          <label className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2.5 ring-1 ring-warning/30">
            <input
              type="checkbox"
              checked={propagateCurrency}
              onChange={(e) => setPropagateCurrency(e.target.checked)}
              className="mt-0.5 size-4 cursor-pointer accent-warning"
            />
            <span className="text-xs text-fg">
              Cambiar también la moneda de TODOS los registros existentes de esta cuenta.{' '}
              <span className="text-fg-muted">Útil cuando se importó con la moneda equivocada (ej. ACAP que entró como USD pero era DOP).</span>
            </span>
          </label>
        ) : null}

        {error ? (
          <p className="rounded-md bg-negative/10 px-3 py-2 text-xs text-negative ring-1 ring-negative/30">{error}</p>
        ) : null}
      </div>
    </Drawer>
  )
}

