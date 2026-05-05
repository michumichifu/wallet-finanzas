import type { LucideIcon } from 'lucide-react'

export function PlaceholderPage({ title, icon: Icon }: { title: string; icon: LucideIcon }) {
  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col items-center justify-center p-6">
      <div className="flex size-14 items-center justify-center rounded-xl bg-bg-muted ring-1 ring-border">
        <Icon className="size-6 text-fg-muted" strokeWidth={1.75} />
      </div>
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-fg">{title}</h1>
      <p className="mt-1 max-w-md text-center text-sm text-fg-muted">
        Esta sección estará disponible en próximas fases del roadmap.
      </p>
    </div>
  )
}
