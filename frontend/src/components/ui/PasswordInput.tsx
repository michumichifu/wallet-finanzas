import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/cn'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

/**
 * Input de contraseña con toggle de visibilidad. Mismas clases base que `Input`
 * para mantener coherencia visual; añade botón a la derecha que alterna entre
 * `password` y `text`.
 */
export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(
  { className, ...rest },
  ref,
) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={cn(
          'h-9 w-full rounded-lg border border-border bg-bg-subtle/40 pl-3 pr-10 text-sm text-fg tabular',
          'placeholder:text-fg-subtle',
          'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
          'transition-colors disabled:opacity-50',
          className,
        )}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        tabIndex={-1}
        className={cn(
          'absolute inset-y-0 right-0 flex items-center justify-center px-2.5',
          'text-fg-subtle hover:text-fg transition-colors',
          'focus:outline-none focus:text-fg',
        )}
      >
        {visible ? <EyeOff className="size-4" strokeWidth={2} /> : <Eye className="size-4" strokeWidth={2} />}
      </button>
    </div>
  )
})
