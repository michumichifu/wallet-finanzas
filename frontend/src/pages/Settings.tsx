import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Download, FileDown } from 'lucide-react'
import { Api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAuthStore } from '@/stores/auth.store'

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const [exportRange, setExportRange] = useState<'all' | 'this-year' | 'this-month'>('all')
  const [lastExport, setLastExport] = useState<string | null>(null)

  const exportCsv = useMutation({
    mutationFn: async () => {
      const params: { from?: string; to?: string } = {}
      if (exportRange !== 'all') {
        const now = new Date()
        if (exportRange === 'this-year') {
          params.from = new Date(now.getFullYear(), 0, 1).toISOString()
          params.to = new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString()
        } else if (exportRange === 'this-month') {
          params.from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
          params.to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
        }
      }
      const blob = await Api.exportWalletCsv(params)
      const url = URL.createObjectURL(blob)
      const stamp = new Date().toISOString().slice(0, 10)
      const a = document.createElement('a')
      a.href = url
      a.download = `wallet-export-${stamp}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setLastExport(new Date().toLocaleString('es'))
    },
  })

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-fg md:text-2xl">Ajustes</h1>
        <p className="mt-0.5 text-sm text-fg-muted">Cuenta, exportación, preferencias.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle hint="Datos de tu cuenta">Cuenta</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-fg-muted">Nombre</span>
            <span className="text-fg">{user?.displayName || '—'}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-fg-muted">Email</span>
            <span className="text-fg tabular">{user?.email}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-fg-muted">Rol</span>
            <span className="rounded-md bg-bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-fg">{user?.role}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-fg-muted">Tenant</span>
            <span className="text-fg">{tenant?.name} <span className="ml-1 font-mono text-xs text-fg-subtle">/{tenant?.slug}</span></span>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle hint="Tu data nunca queda atrapada — formato compatible con Wallet by BudgetBakers">
            Exportar
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm text-fg-muted">
            Descarga un CSV con todas tus transacciones en el formato exacto de Wallet original.
            Puedes re-importarlo allá o usarlo en cualquier herramienta que entienda ese formato.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-bg-muted p-1 ring-1 ring-border text-xs">
              {([
                { id: 'all', label: 'Todo' },
                { id: 'this-year', label: 'Este año' },
                { id: 'this-month', label: 'Este mes' },
              ] as const).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setExportRange(opt.id)}
                  className={`rounded-md px-3 py-1 font-medium transition-colors ${
                    exportRange === opt.id ? 'bg-bg text-fg shadow-sm ring-1 ring-border' : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button variant="primary" onClick={() => exportCsv.mutate()} disabled={exportCsv.isPending}>
              <Download />
              {exportCsv.isPending ? 'Generando...' : 'Descargar CSV'}
            </Button>
          </div>
          {lastExport ? (
            <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
              <FileDown className="size-3" strokeWidth={2} />
              Última descarga: {lastExport}
            </p>
          ) : null}
          {exportCsv.isError ? (
            <p className="rounded-md bg-negative/10 px-3 py-2 text-xs text-negative ring-1 ring-negative/30">
              Error al exportar: {(exportCsv.error as Error)?.message ?? 'desconocido'}
            </p>
          ) : null}
        </CardBody>
      </Card>
    </div>
  )
}
