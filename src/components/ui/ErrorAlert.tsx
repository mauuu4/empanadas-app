import { cn } from '@/lib/utils'

interface ErrorAlertProps {
  message: string
  className?: string
}

/**
 * Reusable inline error alert with icon.
 * Replaces the repeated SVG + styling pattern across forms.
 */
export function ErrorAlert({ message, className }: ErrorAlertProps) {
  if (!message) return null

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 ring-1 ring-inset ring-red-200/60',
        className,
      )}
    >
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      {message}
    </div>
  )
}
