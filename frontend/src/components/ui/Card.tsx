import { type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...rest }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-bg-subtle/50 backdrop-blur-sm',
        'shadow-[0_1px_0_0_rgb(0_0_0/3%)]',
        className,
      )}
      {...rest}
    />
  )
}

export function CardHeader({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('flex items-start justify-between gap-2 border-b border-border px-5 py-4', className)} {...rest} />
}

export function CardTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-col">
      <h3 className="text-sm font-medium tracking-tight text-fg">{children}</h3>
      {hint ? <p className="text-xs text-fg-subtle">{hint}</p> : null}
    </div>
  )
}

export function CardBody({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('px-5 py-4', className)} {...rest} />
}
