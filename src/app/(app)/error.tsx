'use client'

import { Button } from '@/components/ui'

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
          <svg
            className="h-8 w-8 text-red-500"
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
        <h2 className="text-lg font-bold text-gray-900">Algo salio mal</h2>
        <p className="mt-2 text-sm text-gray-600">
          Ocurrio un error. Intenta de nuevo.
        </p>
        <div className="mt-6">
          <Button onClick={() => reset()}>Intentar de nuevo</Button>
        </div>
      </div>
    </div>
  )
}
