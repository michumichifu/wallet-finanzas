import { ArrowDownRight, ArrowRightLeft, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/cn'

const map = {
  EXPENSE: { label: 'Gasto', icon: ArrowDownRight, classes: 'bg-negative/10 text-negative ring-negative/30' },
  INCOME: { label: 'Ingreso', icon: ArrowUpRight, classes: 'bg-positive/10 text-positive ring-positive/30' },
  TRANSFER: { label: 'Transfer', icon: ArrowRightLeft, classes: 'bg-bg-muted text-fg-muted ring-border' },
} as const

export function RecordTypeBadge({ type }: { type: 'EXPENSE' | 'INCOME' | 'TRANSFER' }) {
  const it = map[type]
  const Icon = it.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1',
        it.classes,
      )}
    >
      <Icon className="size-3" strokeWidth={2.5} />
      {it.label}
    </span>
  )
}
