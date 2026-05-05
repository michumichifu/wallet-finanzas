import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark, Plus, Trash2, Zap } from 'lucide-react'
import { Api, type AccountListItem, type TemplateView } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { FieldLabel, Input, Select, Textarea } from '@/components/ui/Input'
import { fmtMoneyByCurrency } from '@/lib/format'
import { cn } from '@/lib/cn'

interface Props {
  open: boolean
  onClose: () => void
}

export function QuickTemplatesPanel({ open, onClose }: Props) {
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)

  const templatesQ = useQuery({ queryKey: ['templates'], queryFn: Api.listTemplates, enabled: open })

  const apply = useMutation({
    mutationFn: (id: string) => Api.applyTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['records'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
      qc.invalidateQueries({ queryKey: ['dashboard-by-category'] })
      onClose()
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => Api.deleteTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
    },
  })

  return (
    <>
      <Drawer
        open={open && !creating}
        onClose={onClose}
        title="Plantillas rápidas"
        description="Aplica una plantilla y se crea un registro con la fecha actual. Para gastos repetitivos."
        footer={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus />Nueva plantilla
          </Button>
        }
      >
        <div className="flex flex-col gap-2">
          {templatesQ.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-bg-muted" />
            ))
          ) : (templatesQ.data ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Bookmark className="size-6 text-fg-subtle" strokeWidth={1.75} />
              <p className="text-sm text-fg-muted">Sin plantillas todavía.</p>
              <p className="max-w-xs text-xs text-fg-subtle">
                Crea plantillas para gastos repetitivos (alquiler, suscripciones, recargas) y aplícalas en un click.
              </p>
            </div>
          ) : (
            templatesQ.data?.map((t) => (
              <TemplateRow
                key={t.id}
                template={t}
                onApply={() => apply.mutate(t.id)}
                onDelete={() => {
                  if (confirm(`¿Borrar plantilla "${t.name}"?`)) remove.mutate(t.id)
                }}
                applying={apply.isPending && apply.variables === t.id}
              />
            ))
          )}
        </div>
      </Drawer>
      <CreateTemplateDrawer open={open && creating} onClose={() => setCreating(false)} />
    </>
  )
}

function TemplateRow({
  template,
  onApply,
  onDelete,
  applying,
}: {
  template: TemplateView
  onApply: () => void
  onDelete: () => void
  applying: boolean
}) {
  return (
    <div className={cn(
      'flex items-center gap-3 rounded-lg border border-border bg-bg-subtle/40 p-3',
      'hover:border-accent/40 transition-colors',
    )}>
      <div className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg ring-1',
        template.type === 'INCOME' ? 'bg-positive/10 text-positive ring-positive/30' : 'bg-negative/10 text-negative ring-negative/30',
      )}>
        <Zap className="size-4" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{template.name}</p>
        <p className="truncate text-xs text-fg-muted tabular">
          {fmtMoneyByCurrency(template.amount, template.currencyCode)}
          {template.note ? <span className="ml-1.5 text-fg-subtle">· {template.note}</span> : null}
        </p>
      </div>
      <button
        type="button"
        onClick={onApply}
        disabled={applying}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-medium text-accent-fg',
          'hover:bg-accent/90 disabled:opacity-50',
        )}
      >
        {applying ? '...' : 'Aplicar'}
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Borrar plantilla"
        className="inline-flex size-7 items-center justify-center rounded-md text-fg-subtle hover:bg-negative/10 hover:text-negative"
      >
        <Trash2 className="size-3.5" strokeWidth={2} />
      </button>
    </div>
  )
}

function CreateTemplateDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const accountsQ = useQuery({ queryKey: ['accounts'], queryFn: Api.listAccounts, enabled: open })
  const categoriesQ = useQuery({ queryKey: ['categories-tree'], queryFn: Api.listCategoryTree, enabled: open })

  const [name, setName] = useState('')
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [payee, setPayee] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const selectedAccount = accountsQ.data?.find((a: AccountListItem) => a.id === accountId)

  const create = useMutation({
    mutationFn: () => {
      if (!selectedAccount) throw new Error('Cuenta requerida')
      return Api.createTemplate({
        name: name.trim(),
        type,
        accountId,
        categoryId: categoryId || undefined,
        amount: Math.abs(Number(amount)),
        currencyCode: selectedAccount.currencyCode,
        payee: payee || undefined,
        note: note || undefined,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      setName('')
      setAccountId('')
      setCategoryId('')
      setAmount('')
      setPayee('')
      setNote('')
      onClose()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string | string[] } }; message?: string }
      const m = e.response?.data?.message ?? e.message
      setError(Array.isArray(m) ? m.join(', ') : (m ?? 'Error'))
    },
  })

  const flatCategories: { id: string; label: string; kind: string }[] = []
  for (const root of categoriesQ.data ?? []) {
    if (root.kind === 'TRANSFER' || root.kind === 'SYSTEM') continue
    flatCategories.push({ id: root.id, label: root.name, kind: root.kind })
    for (const child of root.children) {
      flatCategories.push({ id: child.id, label: `   ${child.name}`, kind: child.kind })
    }
  }
  const filteredCats = flatCategories.filter((c) =>
    type === 'EXPENSE' ? c.kind === 'EXPENSE' || c.kind === 'BOTH' : c.kind === 'INCOME' || c.kind === 'BOTH',
  )

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Nueva plantilla"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={create.isPending}
            onClick={() => {
              setError(null)
              if (!name.trim()) return setError('Nombre requerido')
              if (!accountId) return setError('Cuenta requerida')
              if (!Number.isFinite(Number(amount)) || Number(amount) === 0) return setError('Monto inválido')
              create.mutate()
            }}
          >
            {create.isPending ? 'Guardando...' : 'Guardar plantilla'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FieldLabel>
          Nombre de la plantilla
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Pago Internet, Recarga Claro" />
        </FieldLabel>
        <FieldLabel>
          Tipo
          <Select value={type} onChange={(e) => setType(e.target.value as 'EXPENSE' | 'INCOME')}>
            <option value="EXPENSE">Gasto</option>
            <option value="INCOME">Ingreso</option>
          </Select>
        </FieldLabel>
        <FieldLabel>
          Cuenta
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Selecciona...</option>
            {accountsQ.data?.filter((a) => !a.isArchived).map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.currencyCode})</option>
            ))}
          </Select>
        </FieldLabel>
        <FieldLabel hint={selectedAccount ? `(${selectedAccount.currencyCode})` : ''}>
          Monto
          <Input type="number" inputMode="decimal" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </FieldLabel>
        <FieldLabel>
          Categoría
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Sin categoría</option>
            {filteredCats.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </Select>
        </FieldLabel>
        <FieldLabel hint="opcional">
          Beneficiario
          <Input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="Ej: CANTV" />
        </FieldLabel>
        <FieldLabel hint="opcional">
          Nota predeterminada
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Texto que se copiará a cada registro creado" />
        </FieldLabel>
        {error ? (
          <p className="rounded-md bg-negative/10 px-3 py-2 text-xs text-negative ring-1 ring-negative/30">{error}</p>
        ) : null}
      </div>
    </Drawer>
  )
}
