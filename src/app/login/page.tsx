import { LoginForm } from '@/components/auth/LoginForm'
import { APP_NAME } from '@/lib/constants'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-warm px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25">
            <span className="text-4xl" role="img" aria-label="Empanada">
              🥟
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sistema de ventas diarias
          </p>
        </div>

        <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-6 shadow-elevated border border-white/60">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
