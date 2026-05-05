import { useEffect, useRef, useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

export type DateRangePreset = 'this-month' | 'last-month' | 'last-3-months' | 'last-6-months' | 'this-year' | 'last-year' | 'all-time' | 'custom'

export interface DateRange {
  from: Date
  to: Date
  preset: DateRangePreset
  label: string
}

const PRESETS: { id: Exclude<DateRangePreset, 'custom'>; label: string }[] = [
  { id: 'this-month', label: 'Este mes' },
  { id: 'last-month', label: 'Mes pasado' },
  { id: 'last-3-months', label: 'Últimos 3 meses' },
  { id: 'last-6-months', label: 'Últimos 6 meses' },
  { id: 'this-year', label: 'Este año' },
  { id: 'last-year', label: 'Año pasado' },
  { id: 'all-time', label: 'Todo el historial' },
]

export function computeRange(preset: Exclude<DateRangePreset, 'custom'>): DateRange {
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
  const startOfMonth = (y: number, m: number) => new Date(y, m, 1)
  const endOfMonth = (y: number, m: number) => new Date(y, m + 1, 0, 23, 59, 59)

  let from: Date
  let to: Date
  let label: string
  switch (preset) {
    case 'this-month':
      from = startOfMonth(now.getFullYear(), now.getMonth())
      to = endOfMonth(now.getFullYear(), now.getMonth())
      label = from.toLocaleDateString('es', { month: 'long', year: 'numeric' })
      break
    case 'last-month': {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      from = startOfMonth(d.getFullYear(), d.getMonth())
      to = endOfMonth(d.getFullYear(), d.getMonth())
      label = from.toLocaleDateString('es', { month: 'long', year: 'numeric' })
      break
    }
    case 'last-3-months':
      from = startOfMonth(now.getFullYear(), now.getMonth() - 2)
      to = endOfMonth(now.getFullYear(), now.getMonth())
      label = 'Últimos 3 meses'
      break
    case 'last-6-months':
      from = startOfMonth(now.getFullYear(), now.getMonth() - 5)
      to = endOfMonth(now.getFullYear(), now.getMonth())
      label = 'Últimos 6 meses'
      break
    case 'this-year':
      from = new Date(now.getFullYear(), 0, 1)
      to = endOfDay(new Date(now.getFullYear(), 11, 31))
      label = String(now.getFullYear())
      break
    case 'last-year':
      from = new Date(now.getFullYear() - 1, 0, 1)
      to = endOfDay(new Date(now.getFullYear() - 1, 11, 31))
      label = String(now.getFullYear() - 1)
      break
    case 'all-time':
      from = new Date(2000, 0, 1)
      to = endOfDay(now)
      label = 'Todo el historial'
      break
  }
  return { from: startOfDay(from), to, preset, label }
}

interface Props {
  value: DateRange
  onChange: (r: DateRange) => void
}

export function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  function applyPreset(p: Exclude<DateRangePreset, 'custom'>) {
    onChange(computeRange(p))
    setOpen(false)
  }

  function applyCustom() {
    if (!customFrom || !customTo) return
    const from = new Date(customFrom + 'T00:00:00')
    const to = new Date(customTo + 'T23:59:59')
    if (isNaN(from.getTime()) || isNaN(to.getTime())) return
    if (from > to) return
    const label = `${from.toLocaleDateString('es', { day: 'numeric', month: 'short' })} – ${to.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}`
    onChange({ from, to, preset: 'custom', label })
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-bg-subtle/40',
          'px-3 text-sm text-fg hover:bg-bg-muted transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-accent',
        )}
      >
        <Calendar className="size-4 text-fg-muted" strokeWidth={2} />
        <span className="capitalize">{value.label}</span>
        <ChevronDown className="size-3.5 text-fg-subtle" strokeWidth={2} />
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-bg shadow-2xl">
          <div className="flex flex-col py-1">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={cn(
                  'flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-bg-muted',
                  value.preset === p.id ? 'text-fg' : 'text-fg-muted',
                )}
              >
                <span>{p.label}</span>
                {value.preset === p.id ? <span className="size-1.5 rounded-full bg-accent" /> : null}
              </button>
            ))}
          </div>
          <div className="border-t border-border bg-bg-subtle/40 px-3 py-3">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">Rango personalizado</p>
            <div className="flex flex-col gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 rounded-md border border-border bg-bg px-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 rounded-md border border-border bg-bg px-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="button"
                onClick={applyCustom}
                className="h-8 rounded-md bg-accent px-3 text-xs font-medium text-accent-fg hover:bg-accent/90"
              >
                Aplicar rango
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
