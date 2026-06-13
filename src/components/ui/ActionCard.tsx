import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface ActionCardProps {
  href: string
  icon: ReactNode
  iconBg: string
  title: string
  subtitle: string
  status?: 'done' | 'pending'
  className?: string
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg className="h-4 w-4 text-warm-300" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
    </svg>
  )
}

export function ActionCard({
  href,
  icon,
  iconBg,
  title,
  subtitle,
  status,
  className,
}: ActionCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3.5 rounded-2xl bg-[#fffcf8] p-4 shadow-card border transition-all duration-150 hover:shadow-card-hover active:scale-[0.98]',
        status === 'done'
          ? 'border-emerald-200/80 bg-emerald-50/30'
          : 'border-warm-200/60 hover:border-warm-300/60',
        className,
      )}
    >
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconBg)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn(
          'text-sm font-semibold',
          status === 'done' ? 'text-warm-700' : 'text-warm-900',
        )}>
          {title}
        </p>
        <p className="truncate text-xs text-warm-400">{subtitle}</p>
      </div>
      {status === 'done' ? <CheckIcon /> : <ChevronIcon />}
    </Link>
  )
}
