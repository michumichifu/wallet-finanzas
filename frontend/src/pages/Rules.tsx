import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit2, Play, Plus, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { Api, type CategoryFlat, type RuleConditionItem, type RuleView } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { FieldLabel, Input, Select } from '@/components/ui/Input'
import { cn } from '@/lib/cn'

export function RulesPage() {
  const qc = useQueryClient()
  const rulesQ = useQuery({ queryKey: ['rules'], queryFn: Api.listRules })
  const catsQ = useQuery({ queryKey: ['categories-flat'], queryFn: Api.listCategoriesFlat })
  const [editing, setEditing] = useState<RuleView | null>(null)
  const [creating, setCreating] = useState(false)
  const [applyResult, setApplyResult] = useState<{ scanned: number; updated: number } | null>(null)

  const applyAll = useMutation({
    mutationFn: (overwriteAll: boolean) => Api.applyAllRules(overwriteAll),
    onSuccess: (data) => {
      setApplyResult(data)
      qc.invalidateQueries({ queryKey: ['records'] })
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
      qc.invalidateQueries({ queryKey: ['dashboard-by-category'] })
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => Api.deleteRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rules'] }),
  })

  const toggle = useMutation({
    mutationFn: (rule: RuleView) => Api.patchRule(rule.id, { isActive: !rule.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rules'] }),
  })

  const categoriesById = new Map((catsQ.data ?? []).map((c) => [c.id, c]))

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg md:text-2xl">Reglas automáticas</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            Auto-categoriza nuevos registros que coincidan con un patrón en la nota o el beneficiario.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => applyAll.mutate(false)} disabled={applyAll.isPending}>
            <Play />
            {applyAll.isPending ? 'Aplicando...' : 'Aplicar a registros sin categoría'}
          </Button>
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus />Nueva
          </Button>
        </div>
      </header>

      {applyResult ? (
        <div className="rounded-lg bg-positive/10 px-4 py-2.5 text-sm text-positive ring-1 ring-positive/30">
          Escaneados {applyResult.scanned} registros · {applyResult.updated} categorizados.
        </div>
      ) : null}

      <Card>
        {rulesQ.isLoading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-3 w-1/2 animate-pulse rounded bg-bg-muted" />
            ))}
          </div>
        ) : (rulesQ.data ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Sparkles className="size-6 text-fg-subtle" strokeWidth={1.75} />
            <p className="text-sm text-fg-muted">Sin reglas todavía.</p>
            <p className="max-w-sm text-xs text-fg-subtle">
              Ejemplos útiles: si la nota contiene "Cochino" → categoría Comestibles; si el beneficiario contiene "Claro" → Telefonía móvil.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(rulesQ.data ?? []).map((r) => (
              <RuleRow
                key={r.id}
                rule={r}
                category={r.action.setCategoryId ? categoriesById.get(r.action.setCategoryId) ?? null : null}
                onEdit={() => setEditing(r)}
                onDelete={() => {
                  if (confirm(`¿Borrar regla "${r.name}"?`)) remove.mutate(r.id)
                }}
                onToggle={() => toggle.mutate(r)}
              />
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle hint="Útil cuando creas una regla nueva y quieres categorizar lo que ya existe">
            Aplicar también a registros con categoría
          </CardTitle>
        </CardHeader>
        <CardBody>
          <Button variant="ghost" onClick={() => applyAll.mutate(true)} disabled={applyAll.isPending}>
            <Wand2 />
            Sobreescribir categorías existentes
          </Button>
          <p className="mt-2 text-xs text-fg-subtle">
            Cuidado: esto puede cambiar la categoría de registros ya organizados manualmente.
          </p>
        </CardBody>
      </Card>

      <RuleDrawer
        open={!!editing || creating}
        onClose={() => {
          setEditing(null)
          setCreating(false)
        }}
        rule={editing}
        categories={catsQ.data ?? []}
      />
    </div>
  )
}

function RuleRow({
  rule,
  category,
  onEdit,
  onDelete,
  onToggle,
}: {
  rule: RuleView
  category: CategoryFlat | null
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const items = rule.condition.items ?? []
  return (
    <div className={cn('flex items-center gap-3 px-5 py-3', !rule.isActive && 'opacity-60')}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={rule.isActive ? 'Desactivar' : 'Activar'}
        className={cn(
          'h-5 w-9 rounded-full p-0.5 transition-colors',
          rule.isActive ? 'bg-positive' : 'bg-bg-muted ring-1 ring-border',
        )}
      >
        <span
          className={cn(
            'block size-4 rounded-full bg-bg-subtle shadow-sm transition-transform',
            rule.isActive ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{rule.name}</p>
        <p className="truncate text-xs text-fg-muted">
          {items.length === 0
            ? <span className="text-fg-subtle">Sin condiciones</span>
            : items.map(formatCondition).join(rule.condition.combinator === 'OR' ? ' o ' : ' y ')
          }
        </p>
        <p className="mt-0.5 text-xs text-fg-subtle">
          → {category ? category.name : <span className="italic">categoría removida</span>}
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label="Editar"
        className="inline-flex size-7 items-center justify-center rounded-md text-fg-muted hover:bg-bg-muted hover:text-fg"
      >
        <Edit2 className="size-3.5" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Borrar"
        className="inline-flex size-7 items-center justify-center rounded-md text-fg-subtle hover:bg-negative/10 hover:text-negative"
      >
        <Trash2 className="size-3.5" strokeWidth={2} />
      </button>
    </div>
  )
}

function formatCondition(c: RuleConditionItem): string {
  const fieldEs: Record<string, string> = {
    note: 'nota',
    payee: 'beneficiario',
    amount: 'monto',
    currencyCode: 'moneda',
    accountId: 'cuenta',
    paymentType: 'método pago',
  }
  const opEs: Record<string, string> = {
    contains: 'contiene',
    notContains: 'no contiene',
    equals: '=',
    startsWith: 'empieza con',
    endsWith: 'termina con',
    gt: '>',
    gte: '≥',
    lt: '<',
    lte: '≤',
  }
  return `${fieldEs[c.field] ?? c.field} ${opEs[c.operator] ?? c.operator} "${c.value}"`
}

function RuleDrawer({
  open,
  onClose,
  rule,
  categories,
}: {
  open: boolean
  onClose: () => void
  rule: RuleView | null
  categories: CategoryFlat[]
}) {
  const qc = useQueryClient()
  const isEdit = !!rule
  const [name, setName] = useState('')
  const [field, setField] = useState<'note' | 'payee'>('note')
  const [operator, setOperator] = useState<'contains' | 'startsWith' | 'equals'>('contains')
  const [value, setValue] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (rule) {
      setName(rule.name)
      const first = rule.condition.items?.[0]
      setField((first?.field as 'note' | 'payee') ?? 'note')
      setOperator((first?.operator as 'contains' | 'startsWith' | 'equals') ?? 'contains')
      setValue(first ? String(first.value) : '')
      setCategoryId(rule.action.setCategoryId ?? '')
    } else {
      setName('')
      setField('note')
      setOperator('contains')
      setValue('')
      setCategoryId('')
    }
    setError(null)
  }, [open, rule])

  const create = useMutation({
    mutationFn: () =>
      Api.createRule({
        name: name.trim(),
        condition: { combinator: 'AND', items: [{ field, operator, value, caseSensitive: false }] },
        action: { setCategoryId: categoryId },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rules'] })
      onClose()
    },
    onError: (err: unknown) => setError(extractError(err)),
  })

  const patch = useMutation({
    mutationFn: () =>
      Api.patchRule(rule!.id, {
        name: name.trim(),
        condition: { combinator: 'AND', items: [{ field, operator, value, caseSensitive: false }] },
        action: { setCategoryId: categoryId || null },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rules'] })
      onClose()
    },
    onError: (err: unknown) => setError(extractError(err)),
  })

  const submitting = create.isPending || patch.isPending

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar regla' : 'Nueva regla'}
      description="Si una nueva transacción cumple la condición, se le asigna automáticamente la categoría."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={submitting}
            onClick={() => {
              setError(null)
              if (!name.trim()) return setError('Nombre requerido')
              if (!value.trim()) return setError('Valor de la condición requerido')
              if (!categoryId) return setError('Selecciona la categoría destino')
              isEdit ? patch.mutate() : create.mutate()
            }}
          >
            {submitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FieldLabel>
          Nombre
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Cochino → Comestibles" />
        </FieldLabel>

        <div className="grid grid-cols-2 gap-3">
          <FieldLabel>
            Si
            <Select value={field} onChange={(e) => setField(e.target.value as 'note' | 'payee')}>
              <option value="note">la nota</option>
              <option value="payee">el beneficiario</option>
            </Select>
          </FieldLabel>
          <FieldLabel>
            condición
            <Select value={operator} onChange={(e) => setOperator(e.target.value as 'contains' | 'startsWith' | 'equals')}>
              <option value="contains">contiene</option>
              <option value="startsWith">empieza con</option>
              <option value="equals">es exactamente</option>
            </Select>
          </FieldLabel>
        </div>

        <FieldLabel hint="no diferencia mayúsculas/minúsculas">
          el texto
          <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ej: cochino, almuerzo, claro" />
        </FieldLabel>

        <FieldLabel>
          Entonces, asignar categoría
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Selecciona...</option>
            {categories
              .filter((c) => !c.isSystem && !c.isArchived)
              .map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </Select>
        </FieldLabel>

        {error ? (
          <p className="rounded-md bg-negative/10 px-3 py-2 text-xs text-negative ring-1 ring-negative/30">{error}</p>
        ) : null}
      </div>
    </Drawer>
  )
}

function extractError(err: unknown): string {
  const e = err as { response?: { data?: { message?: string | string[] } } }
  const m = e.response?.data?.message
  return Array.isArray(m) ? m.join(', ') : (m ?? 'Error al guardar')
}
