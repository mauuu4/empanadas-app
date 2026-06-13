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
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' })
    }
    window.location.href = '/login'
  }

  const initials = vendedor.nombre
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="sticky top-0 z-40 glass border-b border-warm-200/50">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-sm font-bold text-white shadow-md shadow-amber-600/20">
            {initials}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#faf6f1] bg-emerald-500" />
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-warm-900 leading-tight">
              {vendedor.nombre}
            </p>
            <p className="text-[11px] font-medium text-warm-400">
              {vendedor.rol === 'admin' ? 'Administrador' : 'Vendedor'}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-warm-400 transition-all duration-200 hover:bg-warm-100 hover:text-warm-600 active:scale-95"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Salir
        </button>
      </div>
    </header>
  )
}
