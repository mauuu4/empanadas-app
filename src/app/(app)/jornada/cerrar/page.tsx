import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCurrentJornadaDate, buildAdminQuery } from '@/lib/utils'
import { CerrarVentaForm } from '@/components/jornada/CerrarVentaForm'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { getUser, getVendedor } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function CerrarPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; vendedor?: string }>
}) {
  const params = await searchParams
  const [user, vendedor, supabase] = await Promise.all([getUser(), getVendedor(), createClient()])

  if (!user) redirect('/login')

  const vendedorId = user.user_metadata.vendedor_id as string
  const isAdmin = vendedor?.rol === 'admin'

  const actualFecha = isAdmin && params.fecha ? params.fecha : getCurrentJornadaDate()
  const actualVendedorId = isAdmin && params.vendedor ? params.vendedor : vendedorId
  const adminQuery = isAdmin ? buildAdminQuery(params) : ''
  const backHref = adminQuery ? `/jornada${adminQuery}` : '/dashboard'

  const { data: jornada } = await supabase
    .from('jornadas')
    .select('*')
    .eq('fecha', actualFecha)
    .single()

  if (!jornada) {
    return (
      <EmptyState
        title="No hay jornada creada para hoy."
        action={{ href: backHref, label: 'Volver' }}
        className="py-12"
      />
    )
  }

  const [{ data: asignacionesRaw }, { data: movimientos }] = await Promise.all([
    supabase
      .from('asignaciones')
      .select('id, producto_id, cantidad_inicial, cantidad_sobrante')
      .eq('jornada_id', jornada.id)
      .eq('vendedor_id', actualVendedorId),
    supabase
      .from('movimientos')
      .select('tipo, monto')
      .eq('jornada_id', jornada.id)
      .eq('vendedor_id', actualVendedorId),
  ])

  if (!asignacionesRaw || asignacionesRaw.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="h-7 w-7 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
        }
        iconBg="bg-orange-50"
        title="No tienes productos asignados para hoy."
        action={{ href: `/jornada/asignar${adminQuery}`, label: 'Asignar productos', direction: 'forward' }}
        className="py-12"
      />
    )
  }

  const productoIds = asignacionesRaw.map((a) => a.producto_id)
  const { data: productos } = await supabase
    .from('productos')
    .select('*')
    .in('id', productoIds)
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true })

  const asignaciones = (productos ?? [])
    .map((p) => {
      const a = asignacionesRaw.find((a) => a.producto_id === p.id)!
      return a ? { ...a, producto: p } : null
    })
    .filter((a) => a !== null)

  let totalGastos = 0
  let totalTransferencias = 0
  let totalDescuentos = 0
  for (const m of movimientos ?? []) {
    if (m.tipo === 'gasto') totalGastos += m.monto
    else if (m.tipo === 'transferencia') totalTransferencias += m.monto
    else totalDescuentos += m.monto
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Cerrar venta"
        subtitle="Registra tus sobrantes para cerrar"
        backHref={backHref}
      />

      <CerrarVentaForm
        asignaciones={asignaciones}
        jornadaId={jornada.id}
        vendedorId={actualVendedorId}
        totalGastos={totalGastos}
        totalTransferencias={totalTransferencias}
        totalDescuentos={totalDescuentos}
      />
    </div>
  )
}
