import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

function Badge({
  className,
  variant = 'default',
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-600 ring-gray-200/60',
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
    warning: 'bg-amber-50 text-amber-700 ring-amber-200/60',
    danger: 'bg-red-50 text-red-700 ring-red-200/60',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export { Badge, type BadgeProps }
