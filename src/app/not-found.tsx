import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-100">
          <span className="text-4xl font-bold text-orange-500">404</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">
          Pagina no encontrada
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          La pagina que buscas no existe o fue movida.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-orange-500 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}
