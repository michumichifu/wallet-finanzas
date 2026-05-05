import { Wallet } from 'lucide-react'

function App() {
  return (
    <div className="flex min-h-full items-center justify-center bg-bg p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-bg-muted ring-1 ring-border">
          <Wallet className="size-6 text-accent" strokeWidth={2} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          Wallet: Finanzas personales
        </h1>
        <p className="max-w-md text-sm text-fg-muted">
          Pre-alfa. Scaffolding de fase 0. Próximo paso: importar tu CSV de
          Wallet by BudgetBakers y generar dashboard con tasa P2P real.
        </p>
        <p className="font-mono text-xs text-fg-subtle tabular">
          v0.0.1 · main
        </p>
      </div>
    </div>
  )
}

export default App
