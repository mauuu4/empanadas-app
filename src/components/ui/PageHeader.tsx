import Link from 'next/link'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  backLabel?: string
  badge?: ReactNode
}

export function PageHeader({ title, subtitle, backHref, backLabel = 'Volver', badge }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="font-display text-[1.7rem] font-semibold leading-tight tracking-tight text-warm-900">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm capitalize text-warm-400">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {badge}
        {backHref && (
          <Link
            href={backHref}
            className="flex items-center gap-1 text-sm font-medium text-warm-400 transition-colors hover:text-warm-600"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
            {backLabel}
          </Link>
        )}
      </div>
    </div>
  )
}
