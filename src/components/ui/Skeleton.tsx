/**
 * Skeletons de carga reutilizables. Usan la clase `.skeleton` (shimmer) de
 * globals.css. Se muestran vía los archivos `loading.tsx` de cada ruta para
 * dar una carga percibida instantánea mientras el Server Component resuelve.
 */

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

export function SkeletonList({
  rows = 4,
  rowClass = 'h-14',
}: {
  rows?: number
  rowClass?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} className={`rounded-xl ${rowClass}`} />
      ))}
    </div>
  )
}

/**
 * Esqueleto genérico de página: título + tarjeta destacada + lista.
 * Sirve para la mayoría de rutas (dashboard, semana, historial, día).
 */
export function PageSkeleton({
  withHero = true,
  rows = 4,
}: {
  withHero?: boolean
  rows?: number
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <SkeletonBlock className="h-7 w-40 rounded-lg" />
        <SkeletonBlock className="h-4 w-28 rounded-lg" />
      </div>
      {withHero && <SkeletonBlock className="h-28 w-full rounded-2xl" />}
      <div className="rounded-2xl bg-[#fffcf8] p-4 shadow-card">
        <SkeletonBlock className="mb-3 h-5 w-32 rounded-lg" />
        <SkeletonList rows={rows} />
      </div>
    </div>
  )
}
