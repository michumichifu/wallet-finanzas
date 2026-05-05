import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { Api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { FieldLabel, Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { useAuthStore } from '@/stores/auth.store'

export function RegisterPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const m = useMutation({
    mutationFn: () =>
      Api.register({
        email: email.trim(),
        password,
        displayName: displayName.trim() || undefined,
      }),
    onSuccess: (data) => {
      if (!data.defaultTenant) {
        setError('No se pudo crear tenant.')
        return
      }
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
        tenant: data.defaultTenant,
      })
      navigate('/', { replace: true })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string | string[] } } }
      const msg = e.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'No se pudo registrar'))
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
            if (password.length < 8) {
              setError('La contraseña debe tener al menos 8 caracteres')
              return
            }
            if (password !== passwordConfirm) {
              setError('Las contraseñas no coinciden')
              return
            }
            m.mutate()
          }}
        >
          <h1 className="text-lg font-semibold tracking-tight text-fg">Crear cuenta</h1>
          <p className="mt-1 text-xs text-fg-muted">
            Se crea automáticamente tu tenant personal con catálogo de monedas y categorías.
          </p>

          <div className="mt-5 flex flex-col gap-4">
            <FieldLabel hint="opcional">
              Nombre
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Tu nombre" autoComplete="name" />
            </FieldLabel>
            <FieldLabel>
              Email
              <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
            </FieldLabel>
            <FieldLabel hint="mín. 8 caracteres">
              Contraseña
              <PasswordInput autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </FieldLabel>
            <FieldLabel>
              Confirmar contraseña
              <PasswordInput
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                aria-invalid={passwordConfirm.length > 0 && password !== passwordConfirm}
              />
              {passwordConfirm.length > 0 && password !== passwordConfirm ? (
                <span className="text-[10px] text-negative">No coinciden</span>
              ) : null}
            </FieldLabel>

            {error ? (
              <p className="rounded-md bg-negative/10 px-3 py-2 text-xs text-negative ring-1 ring-negative/30">{error}</p>
            ) : null}

            <Button type="submit" variant="primary" disabled={m.isPending} className="w-full">
              {m.isPending ? 'Creando...' : 'Crear cuenta'}
            </Button>
          </div>
        </form>

        <p className="mt-4 text-center text-xs text-fg-muted">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
