import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Image as ImageIcon, Info, Trash2, Upload } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Api, type AccountListItem } from '@/lib/api'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { FieldLabel, Input, Select } from '@/components/ui/Input'
import { resolveLucideIcon } from '@/components/AccountCard'
import { cn } from '@/lib/cn'

const COMMON_CURRENCIES = ['USD', 'VES', 'DOP', 'COP', 'EUR', 'BRL', 'ARS', 'MXN', 'PEN', 'GBP', 'USDT', 'USDC', 'BTC', 'ETH', 'SOL']

const ACCOUNT_TYPES: { id: string; label: string }[] = [
  { id: 'GENERAL', label: 'Cuenta general' },
  { id: 'CASH', label: 'Efectivo' },
  { id: 'CHECKING', label: 'Cuenta corriente' },
  { id: 'SAVINGS', label: 'Cuenta de ahorros' },
  { id: 'CREDIT_CARD', label: 'Tarjeta de crédito' },
  { id: 'DEBIT_CARD', label: 'Tarjeta de débito' },
  { id: 'INVESTMENT', label: 'Cuenta de inversión' },
  { id: 'CRYPTO_EXCHANGE', label: 'Cripto exchange (CEX/DEX)' },
  { id: 'CRYPTO_WALLET', label: 'Cripto wallet' },
  { id: 'CRYPTO', label: 'Cripto (genérico)' },
  { id: 'LOAN', label: 'Préstamo' },
  { id: 'MORTGAGE', label: 'Hipoteca' },
  { id: 'BOND', label: 'Bono' },
  { id: 'LIFE_INSURANCE', label: 'Seguro de vida' },
  { id: 'OVERDRAFT', label: 'Sobregiro' },
  { id: 'OTHER', label: 'Otro' },
]

const PRESET_COLORS = [
  '#7c3aed', '#0ea5e9', '#06b6d4', '#10b981', '#84cc16', '#eab308',
  '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#6366f1',
  '#475569', '#0f172a', '#92400e', '#0891b2',
]

const POPULAR_ICONS = [
  'wallet', 'piggy-bank', 'banknote', 'coins', 'credit-card',
  'landmark', 'building-2', 'bitcoin', 'trending-up', 'briefcase',
  'shield', 'gem', 'home', 'car', 'gift',
  'shopping-cart', 'utensils', 'plane', 'wifi', 'phone',
]

const BANK_HINTS_BY_TYPE: Record<string, string> = {
  CHECKING: 'Ej: BHD, BDV, Bancamiga',
  SAVINGS: 'Ej: BHD, Mercantil',
  CREDIT_CARD: 'Ej: BHD Visa, Bancaribe',
  DEBIT_CARD: 'Ej: BDV',
  CRYPTO_EXCHANGE: 'Ej: Binance, Bybit, Coinbase',
  CRYPTO_WALLET: 'Ej: Phantom, MetaMask, Trust Wallet, Rainbow',
  INVESTMENT: 'Ej: Schwab, Etoro',
  LOAN: 'Ej: BHD préstamo personal',
  MORTGAGE: 'Ej: BHD hipoteca',
}

interface Props {
  open: boolean
  onClose: () => void
  account?: AccountListItem | null
}

export function AccountDrawer({ open, onClose, account }: Props) {
  const qc = useQueryClient()
  const isEdit = !!account

  const [name, setName] = useState('')
  const [currencyCode, setCurrencyCode] = useState('USD')
  const [type, setType] = useState('GENERAL')
  const [bankName, setBankName] = useState('')
  const [color, setColor] = useState<string>(PRESET_COLORS[0])
  const [iconKey, setIconKey] = useState<string>('wallet')
  const [iconColor, setIconColor] = useState<string>('#ffffff')
  const [photoUrl, setPhotoUrl] = useState<string>('')
  const [initialBalance, setInitialBalance] = useState<string>('0')
  const [excludeFromTotals, setExcludeFromTotals] = useState(false)
  const [archived, setArchived] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFixCurrencyHint, setShowFixCurrencyHint] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setName(account?.name ?? '')
    setCurrencyCode(account?.currencyCode ?? 'USD')
    setType(account?.type ?? 'GENERAL')
    setBankName(account?.bankName ?? '')
    setColor(account?.color ?? PRESET_COLORS[0])
    setIconKey(account?.iconKey ?? 'wallet')
    setIconColor(account?.iconColor ?? '#ffffff')
    setPhotoUrl(account?.photoUrl ?? '')
    setInitialBalance(account ? '' : '0')
    setExcludeFromTotals(account?.excludeFromTotals ?? false)
    setArchived(account?.isArchived ?? false)
    setError(null)
    setShowFixCurrencyHint(false)
  }, [open, account?.id])

  const create = useMutation({
    mutationFn: () => Api.createAccount({
      name: name.trim(),
      currencyCode,
      type,
      bankName: bankName.trim() || undefined,
      color: color || undefined,
      iconKey: iconKey || undefined,
      iconColor: iconColor || undefined,
      photoUrl: photoUrl || undefined,
      initialBalance: Number(initialBalance) || 0,
      excludeFromTotals,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['account'] })
      onClose()
    },
    onError: (err: unknown) => setError(extractError(err)),
  })

  const patch = useMutation({
    mutationFn: () => Api.patchAccount(account!.id, {
      name: name.trim(),
      type,
      bankName: bankName.trim() || null,
      color: color || null,
      iconKey: iconKey || null,
      iconColor: iconColor || null,
      photoUrl: photoUrl || null,
      excludeFromTotals,
      isArchived: archived,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['account', account?.id] })
      onClose()
    },
    onError: (err: unknown) => setError(extractError(err)),
  })

  const submitting = create.isPending || patch.isPending

  function onPhotoSelected(file: File) {
    if (file.size > 400_000) {
      setError(`Imagen muy grande (${Math.round(file.size / 1024)} KB). Máx 400 KB. Comprime o reduce dimensiones.`)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setPhotoUrl(reader.result as string)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  const PreviewIcon = resolveLucideIcon(iconKey)

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar cuenta' : 'Nueva cuenta'}
      description={isEdit ? account!.name : 'Define dónde guardas o mueves tu dinero'}
      width="lg"
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
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3 rounded-xl bg-bg-subtle/60 p-3 ring-1 ring-border">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: color }}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="" className="size-12 rounded-xl object-cover" />
            ) : (
              <PreviewIcon className="size-6" strokeWidth={2} style={{ color: iconColor }} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{name || <span className="italic text-fg-subtle">Sin nombre</span>}</p>
            <p className="truncate text-xs text-fg-subtle">{ACCOUNT_TYPES.find((t) => t.id === type)?.label} · {currencyCode}</p>
          </div>
        </div>

        <FieldLabel>
          Nombre
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: USDT Binance, BHD Ahorros" />
        </FieldLabel>

        <div className="grid gap-3 sm:grid-cols-2">
          <FieldLabel>
            Tipo de cuenta
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {ACCOUNT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
          </FieldLabel>
          <FieldLabel hint="banco / exchange / wallet">
            Detalle
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder={BANK_HINTS_BY_TYPE[type] ?? 'Opcional'} />
          </FieldLabel>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FieldLabel>
            Moneda
            <Select
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              disabled={isEdit}
              onClick={() => isEdit && setShowFixCurrencyHint(true)}
            >
              {COMMON_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            {isEdit ? (
              <span className="flex items-start gap-1 text-[10px] text-fg-subtle">
                <Info className="size-3 shrink-0 mt-0.5" strokeWidth={2} />
                La moneda no se puede cambiar tras crear. Si fue por error de import, contacta a soporte para reasignar.
              </span>
            ) : null}
            {showFixCurrencyHint ? (
              <span className="text-[10px] text-warning">Para corregir un import erróneo: API `/accounts/:id/fix-currency`.</span>
            ) : null}
          </FieldLabel>
          <FieldLabel hint={isEdit ? '(no editable tras crear)' : ''}>
            Monto inicial
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              disabled={isEdit}
              placeholder="0.00"
            />
          </FieldLabel>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-fg-muted">Color de la tarjeta</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                className={cn(
                  'size-7 rounded-md ring-2 ring-offset-1 ring-offset-bg transition-transform',
                  color === c ? 'ring-fg scale-110' : 'ring-transparent hover:scale-105',
                )}
                style={{ backgroundColor: c }}
              />
            ))}
            <ColorPicker value={color} onChange={setColor} ariaLabel="Color personalizado de tarjeta" />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-fg-muted">Icono</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-fg-subtle">color del icono</span>
              <ColorPicker value={iconColor} onChange={setIconColor} size="sm" ariaLabel="Color del icono" />
            </div>
          </div>
          <div className="grid grid-cols-8 gap-1.5">
            {POPULAR_ICONS.map((key) => {
              const I = resolveLucideIcon(key) as LucideIcon
              const selected = iconKey === key && !photoUrl
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setIconKey(key)
                    setPhotoUrl('')
                  }}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-md ring-1',
                    selected ? 'bg-accent/10 ring-accent text-accent' : 'bg-bg-muted ring-border text-fg-muted hover:text-fg',
                  )}
                  aria-label={key}
                >
                  <I className="size-4" strokeWidth={2} />
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-[10px] text-fg-subtle">
            Más iconos disponibles vía API. Estos son los más comunes para finanzas.
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-fg-muted">O usa una foto / logo</p>
          <div className="flex items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-lg bg-bg-muted ring-1 ring-border overflow-hidden">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="size-14 object-cover" />
              ) : (
                <ImageIcon className="size-5 text-fg-subtle" strokeWidth={2} />
              )}
            </div>
            <div className="flex flex-1 items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload />Subir
              </Button>
              {photoUrl ? (
                <Button variant="ghost" size="sm" onClick={() => setPhotoUrl('')}>
                  <Trash2 />Quitar
                </Button>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp, image/svg+xml"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onPhotoSelected(f)
                  e.target.value = ''
                }}
                className="hidden"
              />
            </div>
          </div>
          <p className="mt-2 text-[10px] text-fg-subtle">PNG/JPEG/WebP/SVG hasta 400 KB. Si subes foto, prevalece sobre el icono.</p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl bg-bg-subtle/40 p-4 ring-1 ring-border">
          <ToggleRow
            label="Excluir de las estadísticas"
            hint="Esta opción excluye los registros de esta cuenta de los gráficos e informes."
            checked={excludeFromTotals}
            onChange={setExcludeFromTotals}
          />
          {isEdit ? (
            <ToggleRow
              label="Archivar"
              hint="Esta opción oculta la cuenta de todas las páginas, pero mantiene todos sus datos en gráficos e informes."
              checked={archived}
              onChange={setArchived}
            />
          ) : null}
        </div>

        {error ? (
          <p className="rounded-md bg-negative/10 px-3 py-2 text-xs text-negative ring-1 ring-negative/30">{error}</p>
        ) : null}
      </div>
    </Drawer>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'mt-0.5 h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors',
          checked ? 'bg-accent' : 'bg-bg-muted ring-1 ring-border',
        )}
      >
        <span
          className={cn(
            'block size-4 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{label}</p>
        <p className="text-xs text-fg-subtle">{hint}</p>
      </div>
    </div>
  )
}

function extractError(err: unknown): string {
  const e = err as { response?: { data?: { message?: string | string[] } } }
  const m = e.response?.data?.message
  return Array.isArray(m) ? m.join(', ') : (m ?? 'Error al guardar')
}
