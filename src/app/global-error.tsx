'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body className="bg-gray-50">
        <main className="flex min-h-screen items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-100">
              <svg
                className="h-10 w-10 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Algo salio mal</h1>
            <p className="mt-2 text-sm text-gray-600">
              Ocurrio un error inesperado. Intenta de nuevo.
            </p>
            <button
              onClick={() => reset()}
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-orange-500 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              Intentar de nuevo
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
