'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { Button } from './Button'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<
    (ConfirmOptions & { resolve: (value: boolean) => void }) | null
  >(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...options, resolve })
    })
  }, [])

  function handleConfirm() {
    state?.resolve(true)
    setState(null)
  }

  function handleCancel() {
    state?.resolve(false)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {/* Dialog overlay */}
      {state && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-message"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2
              id="confirm-title"
              className="text-lg font-semibold text-gray-900"
            >
              {state.title}
            </h2>
            <p id="confirm-message" className="mt-2 text-sm text-gray-600">
              {state.message}
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                variant="secondary"
                onClick={handleCancel}
                className="flex-1"
              >
                {state.cancelLabel || 'Cancelar'}
              </Button>
              <Button
                variant={state.variant === 'danger' ? 'danger' : 'primary'}
                onClick={handleConfirm}
                className="flex-1"
              >
                {state.confirmLabel || 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return ctx
}
