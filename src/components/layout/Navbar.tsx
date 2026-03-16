'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: '🏠' },
  { href: '/jornada', label: 'Jornada', icon: '📋' },
  { href: '/semana', label: 'Semana', icon: '📊' },
  { href: '/historial', label: 'Historial', icon: '📅' },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white safe-area-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 px-2 py-3 text-xs transition-colors',
                isActive
                  ? 'text-orange-600'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span className={cn('font-medium', isActive && 'font-semibold')}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
