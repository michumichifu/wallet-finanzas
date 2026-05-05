import { Moon, Sun } from 'lucide-react'
import { useThemeStore } from '@/stores/theme.store'
import { cn } from '@/lib/cn'

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme)
  const toggle = useThemeStore((s) => s.toggle)

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-lg',
        'text-fg-muted hover:text-fg hover:bg-bg-muted',
        'ring-1 ring-border transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-accent',
        className,
      )}
    >
      {theme === 'dark' ? <Sun className="size-4" strokeWidth={2} /> : <Moon className="size-4" strokeWidth={2} />}
    </button>
  )
}
