import { LoginForm } from '@/components/auth/LoginForm'
import { APP_NAME } from '@/lib/constants'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-500 shadow-lg">
            <span className="text-4xl" role="img" aria-label="Empanada">
              🥟
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Sistema de ventas diarias
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
