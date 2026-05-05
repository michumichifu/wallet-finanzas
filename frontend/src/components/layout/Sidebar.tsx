import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Receipt, Wallet, FolderTree, Settings, ArrowRightLeft } from 'lucide-react'
import { cn } from '@/lib/cn'

interface NavItem {
  to: string
  icon: typeof LayoutDashboard
  label: string
  end?: boolean
}

const NAV: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/cuentas', icon: Wallet, label: 'Cuentas' },
  { to: '/registros', icon: Receipt, label: 'Registros' },
  { to: '/transferencias', icon: ArrowRightLeft, label: 'Transferencias' },
  { to: '/categorias', icon: FolderTree, label: 'Categorías' },
  { to: '/ajustes', icon: Settings, label: 'Ajustes' },
]

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-bg-subtle md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-accent/10 ring-1 ring-accent/30">
          <Wallet className="size-4 text-accent" strokeWidth={2.25} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight text-fg">Wallet</span>
          <span className="text-[10px] uppercase tracking-wider text-fg-subtle">Finanzas personales</span>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5 p-2">
        {NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium',
                'transition-colors',
                isActive
                  ? 'bg-bg-muted text-fg'
                  : 'text-fg-muted hover:text-fg hover:bg-bg-muted/60',
              )
            }
          >
            <Icon className="size-4" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-border p-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle tabular">
          v0.2.0 · main
        </p>
      </div>
    </aside>
  )
}
