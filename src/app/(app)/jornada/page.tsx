import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { today, formatDate } from '@/lib/utils'
import { Card, CardContent, Badge } from '@/components/ui'
import { ensureJornadaHoy } from '@/lib/jornada-utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function ActionLink({
  href,
  icon,
  iconBg,
  title,
  subtitle,
}: {
  href: string
  icon: React.ReactNode
  iconBg: string
  title: string
  subtitle: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 rounded-2xl bg-white p-4 shadow-card border border-gray-100/80 transition-all duration-150 hover:shadow-card-hover active:scale-[0.98]"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      <svg className="h-4.5 w-4.5 shrink-0 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
      </svg>
    </Link>
  )
}

export default async function JornadaPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const vendedorId = user.user_metadata.vendedor_id as string

  const { data: vendedor } = await supabase
    .from('vendedores')
    .select('*')
    .eq('id', vendedorId)
    .single()

  if (!vendedor) redirect('/login')

  const isAdmin = vendedor.rol === 'admin'
  const fechaHoy = today()

  let jornada = null

  if (isAdmin) {
    const result = await ensureJornadaHoy(supabase)
    jornada = result.jornada
  } else {
    const { data } = await supabase
      .from('jornadas')
      .select('*')
      .eq('fecha', fechaHoy)
      .single()
    jornada = data
  }

  // Si hay jornada, buscar asignaciones del vendedor
  let asignaciones: {
    id: string
    cantidad_inicial: number
    cantidad_sobrante: number | null
    producto_id: string
  }[] = []
  if (jornada) {
    const { data } = await supabase
      .from('asignaciones')
      .select('id, cantidad_inicial, cantidad_sobrante, producto_id')
      .eq('jornada_id', jornada.id)
      .eq('vendedor_id', vendedorId)

    asignaciones = data ?? []
  }

  const hasAsignaciones = asignaciones.length > 0
  const hasCerrado = asignaciones.every((a) => a.cantidad_sobrante !== null)

  return (
    <div className="flex flex-col gap-5 stagger-children">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Jornada</h1>
          <p className="mt-0.5 text-sm capitalize text-gray-400">
            {formatDate(fechaHoy)}
          </p>
        </div>
        {jornada && jornada.estado === 'abierta' && (
          <Badge variant="success">Abierta</Badge>
        )}
      </div>

      {jornada && jornada.estado === 'cerrada' ? (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
              <svg className="h-7 w-7 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-emerald-700">
              Jornada cerrada
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Manana se creara una nueva automaticamente.
            </p>
            <Link
              href="/jornada/resumen"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 active:scale-[0.98]"
            >
              Ver resumen
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </Link>
          </CardContent>
        </Card>
      ) : jornada ? (
        <div className="flex flex-col gap-3">
          <ActionLink
            href="/jornada/asignar"
            icon={
              <svg className="h-5 w-5 text-orange-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
            }
            iconBg="bg-orange-50"
            title="Asignar productos"
            subtitle={hasAsignaciones
              ? `${asignaciones.length} productos asignados`
              : 'Registra los productos que llevas'}
          />

          <ActionLink
            href="/jornada/movimientos"
            icon={
              <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M13.2 2.24a.75.75 0 00.04 1.06l2.1 1.95H6.75a.75.75 0 000 1.5h8.59l-2.1 1.95a.75.75 0 101.02 1.1l3.5-3.25a.75.75 0 000-1.1l-3.5-3.25a.75.75 0 00-1.06.04zm-6.4 8a.75.75 0 00-1.06-.04l-3.5 3.25a.75.75 0 000 1.1l3.5 3.25a.75.75 0 101.02-1.1l-2.1-1.95h8.59a.75.75 0 000-1.5H4.66l2.1-1.95a.75.75 0 00.04-1.06z" clipRule="evenodd" />
              </svg>
            }
            iconBg="bg-blue-50"
            title="Movimientos"
            subtitle="Gastos, transferencias y descuentos"
          />

          <ActionLink
            href="/jornada/cerrar"
            icon={
              <svg className="h-5 w-5 text-violet-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
            }
            iconBg="bg-violet-50"
            title="Cerrar venta"
            subtitle={hasCerrado && hasAsignaciones
              ? 'Venta cerrada - ver resumen'
              : 'Registra sobrantes y cierra tu venta'}
          />

          {isAdmin && (
            <ActionLink
              href="/jornada/resumen"
              icon={
                <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M2 3.75A.75.75 0 012.75 3h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zm0 4.167a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.166a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.167a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                </svg>
              }
              iconBg="bg-emerald-50"
              title="Resumen del dia"
              subtitle="Consolidado de todos los vendedores"
            />
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
              <svg className="h-7 w-7 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">
              No hay jornada creada para hoy.
            </p>
            <p className="mt-1 text-xs text-gray-400">
              El administrador debe iniciar sesion para crear la jornada automaticamente.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
