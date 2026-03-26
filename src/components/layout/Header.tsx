'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Vendedor } from '@/types'

interface HeaderProps {
  vendedor: Vendedor
}

export function Header({ vendedor }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
            {vendedor.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {vendedor.nombre}
            </p>
            <p className="text-xs text-gray-500">
              {vendedor.rol === 'admin' ? 'Admin' : 'Vendedor'}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          Salir
        </button>
      </div>
    </header>
  )
}
