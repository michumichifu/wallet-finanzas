import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Api, type AccountListItem } from '@/lib/api'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { FieldLabel, Input, Select, Textarea } from '@/components/ui/Input'
import { cn } from '@/lib/cn'

type Mode = 'EXPENSE' | 'INCOME' | 'TRANSFER'

interface NewRecordDrawerProps {
  open: boolean
  onClose: () => void
}

export function NewRecordDrawer({ open, onClose }: NewRecordDrawerProps) {
  const qc = useQueryClient()
  const accountsQ = useQuery({ queryKey: ['accounts'], queryFn: Api.listAccounts, enabled: open })
  const categoriesQ = useQuery({ queryKey: ['categories-tree'], queryFn: Api.listCategoryTree, enabled: open })

  const [mode, setMode] = useState<Mode>('EXPENSE')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [note, setNote] = useState('')
  const [payee, setPayee] = useState('')
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [error, setError] = useState<string | null>(null)

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setMode('EXPENSE')
      setAccountId('')
      setToAccountId('')
      setCategoryId('')
      setAmount('')
      setToAmount('')
      setNote('')
      setPayee('')
      setOccurredAt(new Date().toISOString().slice(0, 16))
      setError(null)
    }
  }, [open])

  const createRecord = useMutation({
    mutationFn: Api.createRecord,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['records'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
      qc.invalidateQueries({ queryKey: ['dashboard-by-category'] })
      onClose()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string | string[] } } }
      const m = e.response?.data?.message
      setError(Array.isArray(m) ? m.join(', ') : (m ?? 'Error al guardar'))
    },
  })

  const createTransfer = useMutation({
    mutationFn: Api.createTransfer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['records'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
      onClose()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string | string[] } } }
      const m = e.response?.data?.message
      setError(Array.isArray(m) ? m.join(', ') : (m ?? 'Error al guardar'))
    },
  })

  const flatCategories = useMemo<{ id: string; label: string; kind: string }[]>(() => {
    const out: { id: string; label: string; kind: string }[] = []
    for (const root of categoriesQ.data ?? []) {
      if (root.kind === 'TRANSFER' || root.kind === 'SYSTEM') continue
      out.push({ id: root.id, label: root.name, kind: root.kind })
      for (const child of root.children) {
        out.push({ id: child.id, label: `   ${child.name}`, kind: child.kind })
      }
    }
    return out
  }, [categoriesQ.data])

  const filteredCategories = useMemo(() => {
    if (mode === 'EXPENSE') return flatCategories.filter((c) => c.kind === 'EXPENSE' || c.kind === 'BOTH')
    if (mode === 'INCOME') return flatCategories.filter((c) => c.kind === 'INCOME' || c.kind === 'BOTH')
    return []
  }, [flatCategories, mode])

  const selectedAccount = accountsQ.data?.find((a) => a.id === accountId)
  const selectedToAccount = accountsQ.data?.find((a) => a.id === toAccountId)
  const sameCurrency = selectedAccount && selectedToAccount && selectedAccount.currencyCode === selectedToAccount.currencyCode

  const submitting = createRecord.isPending || createTransfer.isPending

  function submit() {
    setError(null)
    if (!accountId) return setError('Selecciona la cuenta')
    if (!occurredAt) return setError('Selecciona la fecha')
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount === 0) return setError('Monto inválido')

    const occurredIso = new Date(occurredAt).toISOString()

    if (mode === 'TRANSFER') {
      if (!toAccountId) return setError('Selecciona la cuenta destino')
      if (accountId === toAccountId) return setError('Origen y destino deben ser distintos')
      const parsedTo = sameCurrency ? Math.abs(parsedAmount) : Number(toAmount)
      if (!Number.isFinite(parsedTo) || parsedTo <= 0) return setError('Monto destino inválido')
      createTransfer.mutate({
        fromAccountId: accountId,
        toAccountId,
        fromAmount: Math.abs(parsedAmount),
        toAmount: parsedTo,
        occurredAt: occurredIso,
        note: note || undefined,
      })
      return
    }

    if (!selectedAccount) return setError('Cuenta no encontrada')
    createRecord.mutate({
      type: mode,
      accountId,
      categoryId: categoryId || undefined,
      amount: Math.abs(parsedAmount),
      currencyCode: selectedAccount.currencyCode,
      payee: payee || undefined,
      note: note || undefined,
      occurredAt: occurredIso,
    })
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Nuevo registro"
      description="Gasto, ingreso o transferencia entre cuentas"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-bg-muted p-1 ring-1 ring-border">
          {(['EXPENSE', 'INCOME', 'TRANSFER'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                mode === m ? 'bg-bg text-fg shadow-sm ring-1 ring-border' : 'text-fg-muted hover:text-fg',
              )}
            >
              {m === 'EXPENSE' ? 'Gasto' : m === 'INCOME' ? 'Ingreso' : 'Transferencia'}
            </button>
          ))}
        </div>

        <FieldLabel hint={mode === 'TRANSFER' ? '— origen' : undefined}>
          Cuenta
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Selecciona cuenta...</option>
            {accountsQ.data?.filter((a) => !a.isArchived).map((a: AccountListItem) => (
              <option key={a.id} value={a.id}>{a.name} ({a.currencyCode})</option>
            ))}
          </Select>
        </FieldLabel>

        {mode === 'TRANSFER' && (
          <FieldLabel hint="— destino">
            A cuenta
            <Select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
              <option value="">Selecciona cuenta...</option>
              {accountsQ.data?.filter((a) => !a.isArchived && a.id !== accountId).map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.currencyCode})</option>
              ))}
            </Select>
          </FieldLabel>
        )}

        <div className={cn('grid gap-3', mode === 'TRANSFER' && !sameCurrency ? 'grid-cols-2' : 'grid-cols-1')}>
          <FieldLabel hint={selectedAccount ? `(${selectedAccount.currencyCode})` : ''}>
            Monto
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </FieldLabel>
          {mode === 'TRANSFER' && !sameCurrency && (
            <FieldLabel hint={selectedToAccount ? `(${selectedToAccount.currencyCode})` : ''}>
              Monto destino
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={toAmount}
                onChange={(e) => setToAmount(e.target.value)}
                placeholder="0.00"
              />
            </FieldLabel>
          )}
        </div>

        {(mode === 'EXPENSE' || mode === 'INCOME') && (
          <FieldLabel>
            Categoría
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sin categoría</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
          </FieldLabel>
        )}

        <FieldLabel>
          Fecha y hora
          <Input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
        </FieldLabel>

        {(mode === 'EXPENSE' || mode === 'INCOME') && (
          <FieldLabel hint="opcional">
            Beneficiario / pagador
            <Input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="Ej: Mercado central" />
          </FieldLabel>
        )}

        <FieldLabel hint="opcional">
          Nota
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              mode === 'EXPENSE' ? 'Ej: Cochino 12kg a $5/kg' : mode === 'INCOME' ? 'Ej: Pago Zenithe abril' : 'Ej: Conversión P2P 631 Bs/USDT'
            }
          />
        </FieldLabel>

        {error ? (
          <p className="rounded-md bg-negative/10 px-3 py-2 text-xs text-negative ring-1 ring-negative/30">{error}</p>
        ) : null}
      </div>
    </Drawer>
  )
}
