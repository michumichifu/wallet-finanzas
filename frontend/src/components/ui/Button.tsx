import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent/90 focus:ring-accent shadow-[0_1px_0_0_rgb(255_255_255/10%)]',
  secondary: 'bg-bg-muted text-fg hover:bg-bg-muted/80 ring-1 ring-border focus:ring-accent',
  ghost: 'text-fg-muted hover:bg-bg-muted hover:text-fg focus:ring-accent',
  destructive: 'bg-negative/10 text-negative hover:bg-negative/20 ring-1 ring-negative/30 focus:ring-negative',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-xs gap-1.5 [&_svg]:size-3.5',
  md: 'h-9 px-3 text-sm gap-1.5 [&_svg]:size-4',
  lg: 'h-10 px-4 text-sm gap-2 [&_svg]:size-4',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'md', type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg',
        'disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    />
  )
})
