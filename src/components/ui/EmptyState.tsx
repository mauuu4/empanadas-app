import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface EmptyStateAction {
  href: string
  label: string
  direction?: 'back' | 'forward'
}

interface EmptyStateProps {
  icon?: ReactNode
  iconBg?: string
  title: string
  description?: string
  action?: EmptyStateAction
  className?: string
}

const ChevronLeft = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
  </svg>
)

const ChevronRight = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
  </svg>
)

const InfoIcon = () => (
  <svg className="h-7 w-7 text-warm-400" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
  </svg>
)

export function EmptyState({
  icon,
  iconBg = 'bg-warm-100',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-4 py-12', className)}>
      <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl', iconBg)}>
        {icon ?? <InfoIcon />}
      </div>
      <div className="text-center">
        <p className="font-medium text-warm-600">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-warm-400">{description}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="flex items-center gap-1 text-sm font-medium text-amber-600 transition-colors hover:text-amber-700"
        >
          {action.direction !== 'forward' && <ChevronLeft />}
          {action.label}
          {action.direction === 'forward' && <ChevronRight />}
        </Link>
      )}
    </div>
  )
}
