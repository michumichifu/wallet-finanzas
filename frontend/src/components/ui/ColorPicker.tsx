import { useEffect, useRef, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  value: string
  onChange: (color: string) => void
  /** Tamaño del swatch button. Default: md (28px). */
  size?: 'sm' | 'md'
  className?: string
  /** Etiqueta accesible. */
  ariaLabel?: string
}

/**
 * Color picker custom usando react-colorful. Reemplaza al `<input type="color">`
 * nativo cuyo popup tiene tendencia a salirse de drawers laterales en pantallas
 * pequeñas. El popover se posiciona hacia la izquierda y arriba para que entre
 * dentro del contenedor.
 */
export function ColorPicker({ value, onChange, size = 'md', className, ariaLabel = 'Elegir color' }: Props) {
  const [open, setOpen] = useState(false)
  const [hexInput, setHexInput] = useState(value)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setHexInput(value)
  }, [value])

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

  function commitHex(raw: string) {
    let v = raw.trim()
    if (!v.startsWith('#')) v = '#' + v
    if (/^#[0-9a-fA-F]{6}$/.test(v) || /^#[0-9a-fA-F]{3}$/.test(v)) {
      onChange(v)
    }
  }

  const sizeClass = size === 'sm' ? 'size-6' : 'size-7'

  return (
    <div ref={wrapRef} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        title={value}
        className={cn(
          'rounded-md border border-border ring-offset-1 ring-offset-bg cursor-pointer',
          'transition-transform hover:scale-105',
          open && 'ring-2 ring-accent',
          sizeClass,
        )}
        style={{ backgroundColor: value }}
      />
      {open ? (
        <div
          className={cn(
            'absolute z-50 mt-2 w-56 rounded-xl border border-border bg-bg shadow-2xl p-3',
            // Posición: por defecto al lado izquierdo del swatch para que no salga del drawer.
            'right-0',
          )}
        >
          <div className="[&_.react-colorful]:!w-full [&_.react-colorful]:!h-32">
            <HexColorPicker color={value} onChange={onChange} />
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-fg-subtle">HEX</span>
            <input
              type="text"
              value={hexInput}
              onChange={(e) => {
                setHexInput(e.target.value)
                commitHex(e.target.value)
              }}
              onBlur={() => setHexInput(value)}
              className="flex-1 h-7 rounded-md border border-border bg-bg-subtle px-2 text-xs text-fg tabular focus:outline-none focus:ring-2 focus:ring-accent"
              maxLength={7}
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Confirmar"
              className="inline-flex size-7 items-center justify-center rounded-md bg-accent text-accent-fg hover:bg-accent/90"
            >
              <Check className="size-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
