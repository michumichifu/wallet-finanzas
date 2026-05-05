import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { Api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { FieldLabel, Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { useAuthStore } from '@/stores/auth.store'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }
  const setSession = useAuthStore((s) => s.setSession)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const m = useMutation({
    mutationFn: () => Api.login(email.trim(), password),
    onSuccess: (data) => {
      if (!data.defaultTenant) {
        setError('Tu cuenta no tiene tenant asociado.')
        return
      }
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
        tenant: data.defaultTenant,
      })
      navigate(location.state?.from ?? '/', { replace: true })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string | string[] } } }
      const msg = e.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'No se pudo iniciar sesión'))
    },
  })

  return (
    <div className="flex min-h-full items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-accent/10 ring-1 ring-accent/30">
            <Wallet className="size-5 text-accent" strokeWidth={2.25} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold tracking-tight text-fg">Wallet</span>
            <span className="text-[10px] uppercase tracking-wider text-fg-subtle">Finanzas personales</span>
          </div>
        </div>

        <form
          className="rounded-xl border border-border bg-bg-subtle/40 p-6 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            if (!email || !password) {
              setError('Email y contraseña requeridos')
              return
            }
            m.mutate()
          }}
        >
          <h1 className="text-lg font-semibold tracking-tight text-fg">Iniciar sesión</h1>
          <p className="mt-1 text-xs text-fg-muted">Accede a tu panel de finanzas personales.</p>

          <div className="mt-5 flex flex-col gap-4">
            <FieldLabel>
              Email
              <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
            </FieldLabel>
            <FieldLabel>
              Contraseña
              <PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </FieldLabel>

            {error ? (
              <p className="rounded-md bg-negative/10 px-3 py-2 text-xs text-negative ring-1 ring-negative/30">{error}</p>
            ) : null}

            <Button type="submit" variant="primary" disabled={m.isPending} className="w-full">
              {m.isPending ? 'Entrando...' : 'Entrar'}
            </Button>
          </div>
        </form>

        <p className="mt-4 text-center text-xs text-fg-muted">
          ¿Sin cuenta?{' '}
          <Link to="/register" className="font-medium text-accent hover:underline">
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  )
}
