import { Link } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import * as Icons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { type AccountListItem } from '@/lib/api'
import { fmtMoneyByCurrency, fmtUsd } from '@/lib/format'
import { cn } from '@/lib/cn'

/**
 * Resuelve un icono de lucide-react por nombre kebab-case ("wallet",
 * "credit-card", "piggy-bank"). Default: Wallet.
 */
export function resolveLucideIcon(key: string | null): LucideIcon {
  if (!key) return Wallet
  const pascal = key
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
  const all = Icons as unknown as Record<string, LucideIcon>
  return all[pascal] ?? Wallet
}

interface Props {
  account: AccountListItem
  to?: string
  className?: string
}

export function AccountCard({ account, to, className }: Props) {
  const cardBg = account.color ?? undefined
  const Icon = resolveLucideIcon(account.iconKey)
  const iconColor = account.iconColor ?? '#ffffff'

  const inner = (
    <div
      className={cn(
        'group relative flex items-center gap-2.5 overflow-hidden rounded-lg p-3',
        'transition-shadow hover:shadow-lg',
        !cardBg && 'bg-bg-subtle/60 ring-1 ring-border',
        className,
      )}
      style={cardBg ? { backgroundColor: cardBg } : undefined}
    >
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg',
          cardBg ? 'bg-black/15' : 'bg-bg-muted ring-1 ring-border',
        )}
      >
        {account.photoUrl ? (
          <img
            src={account.photoUrl}
            alt=""
            className="size-10 rounded-lg object-cover"
          />
        ) : (
          <Icon className="size-5" strokeWidth={2} style={{ color: iconColor }} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-xs font-medium uppercase tracking-wider', cardBg ? 'text-white/80' : 'text-fg-subtle')}>
          {account.name}
        </p>
        <p className={cn('truncate text-sm font-semibold tabular', cardBg ? 'text-white' : 'text-fg')}>
          {fmtMoneyByCurrency(account.balance, account.currencyCode)}
        </p>
        {account.balanceUsd !== null && account.currencyCode !== 'USD' && account.currencyCode !== 'USDT' && account.currencyCode !== 'USDC' ? (
          <p className={cn('truncate text-[10px] tabular', cardBg ? 'text-white/70' : 'text-fg-subtle')}>
            {fmtUsd(account.balanceUsd)}
          </p>
        ) : null}
      </div>
    </div>
  )

  if (to) {
    return (
      <Link to={to} className="block focus:outline-none focus:ring-2 focus:ring-accent rounded-lg">
        {inner}
      </Link>
    )
  }
  return inner
}
