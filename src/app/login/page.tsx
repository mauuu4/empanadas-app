import { LoginForm } from '@/components/auth/LoginForm'
import { APP_NAME } from '@/lib/constants'

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-warm px-4">
      {/* Decorative warm circles */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-amber-600/8 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 left-1/4 h-40 w-40 rounded-full bg-orange-300/10 blur-2xl" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-22 w-22 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 shadow-lg shadow-amber-600/30 animate-float">
            <span className="text-4xl" role="img" aria-label="Empanada">
              🥟
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-warm-900">
            {APP_NAME}
          </h1>
          <p className="mt-1.5 text-sm text-warm-500">
            Sistema de ventas diarias
          </p>
        </div>

        <div className="relative rounded-3xl bg-white/70 backdrop-blur-md p-6 shadow-elevated border border-white/50">
          <div className="texture-grain absolute inset-0 rounded-3xl" />
          <div className="relative">
            <LoginForm />
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-warm-400">
          Hecho con cari&ntilde;o para la familia
        </p>
      </div>
    </main>
  )
}
