import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit2, FolderTree, Plus, Trash2 } from 'lucide-react'
import { Api, type CategoryFlat, type CategoryKind } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { FieldLabel, Input, Select } from '@/components/ui/Input'
import { cn } from '@/lib/cn'

const KIND_LABEL: Record<CategoryKind, string> = {
  EXPENSE: 'Gasto',
  INCOME: 'Ingreso',
  BOTH: 'Ambos',
  TRANSFER: 'Transferencia',
  SYSTEM: 'Sistema',
}

const KIND_TONE: Record<CategoryKind, string> = {
  EXPENSE: 'bg-negative/10 text-negative ring-negative/30',
  INCOME: 'bg-positive/10 text-positive ring-positive/30',
  BOTH: 'bg-bg-muted text-fg-muted ring-border',
  TRANSFER: 'bg-bg-muted text-fg-muted ring-border',
  SYSTEM: 'bg-bg-muted text-fg-subtle ring-border',
}

export function CategoriesPage() {
  const catsQ = useQuery({ queryKey: ['categories-flat'], queryFn: Api.listCategoriesFlat })
  const [editing, setEditing] = useState<CategoryFlat | null>(null)
  const [creating, setCreating] = useState(false)
  const [showSystem, setShowSystem] = useState(false)

  const { roots, childrenMap } = useMemo(() => {
    const all = (catsQ.data ?? []).filter((c) => showSystem || !c.isSystem)
    const roots: CategoryFlat[] = []
    const childrenMap = new Map<string, CategoryFlat[]>()
    for (const c of all) {
      if (c.parentId) {
        const list = childrenMap.get(c.parentId) ?? []
        list.push(c)
        childrenMap.set(c.parentId, list)
      } else {
        roots.push(c)
      }
    }
    roots.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
    for (const list of childrenMap.values()) {
      list.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
    }
    return { roots, childrenMap }
  }, [catsQ.data, showSystem])

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4 md:p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg md:text-2xl">Categorías</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            {(catsQ.data ?? []).filter((c) => !c.isSystem).length} categorías
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-fg-muted">
            <input
              type="checkbox"
              checked={showSystem}
              onChange={(e) => setShowSystem(e.target.checked)}
              className="size-3.5 cursor-pointer accent-accent"
            />
            mostrar sistema
          </label>
          <Button variant="primary" onClick={() => setCreating(true)}><Plus />Nueva</Button>
        </div>
      </header>

      <Card>
        {catsQ.isLoading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-3 w-1/3 animate-pulse rounded bg-bg-muted" />
            ))}
          </div>
        ) : roots.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <FolderTree className="size-6 text-fg-subtle" strokeWidth={1.75} />
            <p className="text-sm text-fg-muted">Sin categorías. Crea la primera.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {roots.map((root) => (
              <CategoryGroup
                key={root.id}
                root={root}
                children={childrenMap.get(root.id) ?? []}
                onEdit={setEditing}
              />
            ))}
          </div>
        )}
      </Card>

      <CategoryDrawer
        open={!!editing || creating}
        onClose={() => {
          setEditing(null)
          setCreating(false)
        }}
        category={editing}
        rootCategories={roots}
      />
    </div>
  )
}

function CategoryGroup({
  root,
  children,
  onEdit,
}: {
  root: CategoryFlat
  children: CategoryFlat[]
  onEdit: (c: CategoryFlat) => void
}) {
  return (
    <div>
      <CategoryRow category={root} depth={0} onEdit={onEdit} />
      {children.map((c) => (
        <CategoryRow key={c.id} category={c} depth={1} onEdit={onEdit} />
      ))}
    </div>
  )
}

function CategoryRow({
  category,
  depth,
  onEdit,
}: {
  category: CategoryFlat
  depth: number
  onEdit: (c: CategoryFlat) => void
}) {
  const qc = useQueryClient()
  const remove = useMutation({
    mutationFn: () => Api.deleteCategory(category.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories-flat'] })
      qc.invalidateQueries({ queryKey: ['categories-tree'] })
      qc.invalidateQueries({ queryKey: ['records'] })
    },
  })

  return (
    <div className={cn('flex items-center gap-3 px-5 py-2.5 hover:bg-bg-muted/30', depth === 0 ? '' : 'pl-12')}>
      <div className={cn('flex size-7 shrink-0 items-center justify-center rounded-md ring-1', KIND_TONE[category.kind])}>
        <FolderTree className="size-3.5" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cn('truncate text-sm', depth === 0 ? 'font-medium text-fg' : 'text-fg')}>{category.name}</p>
          <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1', KIND_TONE[category.kind])}>
            {KIND_LABEL[category.kind]}
          </span>
          {category.isSystem ? (
            <span className="rounded-md bg-bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-fg-subtle">sistema</span>
          ) : null}
          {category.isArchived ? (
            <span className="rounded-md bg-bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-fg-subtle">archivada</span>
          ) : null}
        </div>
        <p className="text-xs text-fg-subtle font-mono">{category.slug}</p>
      </div>
      <div className="flex items-center gap-0.5">
        {!category.isSystem && (
          <>
            <button
              type="button"
              onClick={() => onEdit(category)}
              aria-label="Editar"
              className="inline-flex size-7 items-center justify-center rounded-md text-fg-muted hover:bg-bg-muted hover:text-fg"
            >
              <Edit2 className="size-3.5" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm('¿Borrar esta categoría? Si tiene registros vinculados se archivará en lugar de borrarse.')) {
                  remove.mutate()
                }
              }}
              aria-label="Borrar"
              className="inline-flex size-7 items-center justify-center rounded-md text-fg-subtle hover:bg-negative/10 hover:text-negative"
            >
              <Trash2 className="size-3.5" strokeWidth={2} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function CategoryDrawer({
  open,
  onClose,
  category,
  rootCategories,
}: {
  open: boolean
  onClose: () => void
  category: CategoryFlat | null
  rootCategories: CategoryFlat[]
}) {
  const qc = useQueryClient()
  const isEdit = !!category
  const [name, setName] = useState('')
  const [kind, setKind] = useState<CategoryKind>('EXPENSE')
  const [parentId, setParentId] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(category?.name ?? '')
    setKind(category?.kind ?? 'EXPENSE')
    setParentId(category?.parentId ?? '')
    setError(null)
  }, [open, category?.id, category?.name, category?.kind, category?.parentId])

  const create = useMutation({
    mutationFn: () => Api.createCategory({
      name: name.trim(),
      kind,
      parentId: parentId || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories-flat'] })
      qc.invalidateQueries({ queryKey: ['categories-tree'] })
      onClose()
    },
    onError: (err: unknown) => setError(extractError(err)),
  })

  const patch = useMutation({
    mutationFn: () => Api.patchCategory(category!.id, {
      name: name.trim() !== category!.name ? name.trim() : undefined,
      kind: kind !== category!.kind ? kind : undefined,
      parentId: parentId !== (category!.parentId ?? '') ? (parentId || null) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories-flat'] })
      qc.invalidateQueries({ queryKey: ['categories-tree'] })
      onClose()
    },
    onError: (err: unknown) => setError(extractError(err)),
  })

  const submitting = create.isPending || patch.isPending

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar categoría' : 'Nueva categoría'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={submitting}
            onClick={() => {
              setError(null)
              if (!name.trim()) return setError('Nombre requerido')
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
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Restaurante" />
        </FieldLabel>
        <FieldLabel>
          Tipo
          <Select value={kind} onChange={(e) => setKind(e.target.value as CategoryKind)}>
            <option value="EXPENSE">Gasto</option>
            <option value="INCOME">Ingreso</option>
            <option value="BOTH">Ambos</option>
          </Select>
        </FieldLabel>
        <FieldLabel hint="opcional, deja en blanco si es categoría raíz">
          Categoría padre
          <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">— sin padre (raíz)</option>
            {rootCategories.filter((c) => c.id !== category?.id).map((c) => (
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
