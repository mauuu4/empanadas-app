import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate, buildAdminQuery } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ActionCard } from '@/components/ui/ActionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { ensureJornadaForDate } from '@/lib/jornada-utils'
import { getUser, getVendedor } from '@/lib/auth'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function JornadaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; vendedor?: string }>
}) {
  const params = await searchParams

  const [vendedor, user] = await Promise.all([getVendedor(), getUser()])

  if (!user || !vendedor) redirect('/login')

  const isAdmin = vendedor.rol === 'admin'

  const isAdminManual = isAdmin && !!params.fecha && !!params.vendedor

  // Esta ruta es exclusivamente el hub por-vendedor del admin (gestionar la
  // jornada de un vendedor en una fecha). Los vendedores gestionan su jornada
  // de hoy directamente desde el dashboard, así que cualquier otro acceso
  // (vendedor, o admin sin fecha+vendedor) se redirige al inicio.
  if (!isAdminManual) redirect('/dashboard')

  const actualFecha = params.fecha!
  const actualVendedorId = params.vendedor!
  const adminQuery = buildAdminQuery(params)

  const adminClient = await createAdminClient()
  const { jornada } = await ensureJornadaForDate(adminClient, actualFecha)

  // Nombre del vendedor objetivo para el contexto del encabezado
  const { data: tv } = await adminClient
    .from('vendedores')
    .select('nombre')
    .eq('id', actualVendedorId)
    .single()
  const targetVendedorNombre = tv?.nombre ?? null

  let asignaciones: {
    id: string
    cantidad_inicial: number
    cantidad_sobrante: number | null
    producto_id: string
  }[] = []

  if (jornada) {
    const { data } = await adminClient
      .from('asignaciones')
      .select('id, cantidad_inicial, cantidad_sobrante, producto_id')
      .eq('jornada_id', jornada.id)
      .eq('vendedor_id', actualVendedorId)

    asignaciones = data ?? []
  }

  const hasAsignaciones = asignaciones.length > 0
  // Solo se considera cerrado si tiene asignaciones Y todas tienen sobrante registrado
  const hasCerradoVenta = hasAsignaciones && asignaciones.every((a) => a.cantidad_sobrante !== null)

  return (
    <div className="flex flex-col gap-5 stagger-children">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {isAdminManual && (
            <Link
              href={`/admin/jornadas/${actualFecha}`}
              className="mb-1 flex items-center gap-0.5 text-xs font-medium text-warm-400 transition-colors hover:text-warm-600"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
              Volver al día
            </Link>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-warm-900">
            {isAdminManual && targetVendedorNombre
              ? targetVendedorNombre
              : 'Jornada'}
          </h1>
          <p className="mt-0.5 text-sm capitalize text-warm-400">
            {formatDate(actualFecha)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {jornada?.estado === 'abierta' && (
            <Badge variant="success">En curso</Badge>
          )}
          {jornada?.estado === 'cerrada' && (
            <Badge variant="default">Cerrada</Badge>
          )}
        </div>
      </div>

      {jornada?.estado === 'cerrada' ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={
                <svg className="h-7 w-7 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
              }
              iconBg="bg-emerald-50"
              title="La jornada de hoy esta cerrada"
              description="Puedes revisar el resumen del dia."
              action={{ href: '/jornada/resumen', label: 'Ver resumen', direction: 'forward' }}
            />
          </CardContent>
        </Card>
      ) : jornada ? (
        <>
          <div className="flex flex-col gap-3">
            <ActionCard
              href={`/jornada/asignar${adminQuery}`}
              icon={
                <svg className="h-5 w-5 text-orange-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
              }
              iconBg="bg-orange-50"
              title="Asignar productos"
              subtitle={hasAsignaciones
                ? `${asignaciones.length} producto${asignaciones.length !== 1 ? 's' : ''} registrado${asignaciones.length !== 1 ? 's' : ''}`
                : 'Registra los productos que llevas hoy'}
              status={hasAsignaciones ? 'done' : undefined}
            />

            <ActionCard
              href={`/jornada/movimientos${adminQuery}`}
              icon={
                <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M13.2 2.24a.75.75 0 00.04 1.06l2.1 1.95H6.75a.75.75 0 000 1.5h8.59l-2.1 1.95a.75.75 0 101.02 1.1l3.5-3.25a.75.75 0 000-1.1l-3.5-3.25a.75.75 0 00-1.06.04zm-6.4 8a.75.75 0 00-1.06-.04l-3.5 3.25a.75.75 0 000 1.1l3.5 3.25a.75.75 0 101.02-1.1l-2.1-1.95h8.59a.75.75 0 000-1.5H4.66l2.1-1.95a.75.75 0 00.04-1.06z" clipRule="evenodd" />
                </svg>
              }
              iconBg="bg-blue-50"
              title="Movimientos"
              subtitle="Registra gastos, transferencias y descuentos"
            />

            <ActionCard
              href={`/jornada/cerrar${adminQuery}`}
              icon={
                <svg className="h-5 w-5 text-violet-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
              }
              iconBg="bg-violet-50"
              title="Cerrar venta"
              subtitle={hasCerradoVenta
                ? 'Venta cerrada — sobrantes registrados'
                : hasAsignaciones
                  ? 'Ingresa los sobrantes al final del dia'
                  : 'Primero asigna productos'}
              status={hasCerradoVenta ? 'done' : undefined}
            />
          </div>
        </>
      ) : (
        <Card>
          <CardContent>
            <EmptyState
              title="No hay jornada activa"
              description="El administrador debe ingresar para iniciar el dia."
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
