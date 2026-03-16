'use client'

import type { ReactNode } from 'react'
import { ToastProvider } from '@/components/ui/Toast'
import { ConfirmProvider } from '@/components/ui/ConfirmDialog'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ToastProvider>
  )
}
