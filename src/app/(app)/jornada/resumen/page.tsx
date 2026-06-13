import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  getCurrentJornadaDate,
  formatDate,
  buildAdminQuery,
} from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { CierreDiaForm } from '@/components/jornada/CierreDiaForm'
import { DiaResumenView } from '@/components/jornada/DiaResumenView'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { calcularResumenDia } from '@/lib/queries'
import { getVendedor } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function ResumenPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; vendedor?: string }>
}) {
  const params = await searchParams

  const [vendedor, supabase] = await Promise.all([getVendedor(), createClient()])

  if (!vendedor) redirect('/login')

  const isAdmin = vendedor.rol === 'admin'
  const actualFecha = isAdmin && params.fecha ? params.fecha : getCurrentJornadaDate()
  const adminQuery = isAdmin ? buildAdminQuery(params) : ''
  const backHref = adminQuery ? `/jornada${adminQuery}` : '/dashboard'

  const [{ data: jornada }, { data: todosVendedores }] = await Promise.all([
    supabase.from('jornadas').select('*').eq('fecha', actualFecha).single(),
    supabase
      .from('vendedores')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre', { ascending: true }),
  ])

  const badge = jornada && (
    <Badge variant={jornada.estado === 'cerrada' ? 'default' : 'success'}>
      {jornada.estado === 'cerrada' ? 'Cerrada' : 'En curso'}
    </Badge>
  )

  if (!jornada) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Resumen del día"
          subtitle={formatDate(actualFecha)}
          backHref={backHref}
        />
        <EmptyState
          title="No hay jornada creada para esta fecha."
          action={{ href: backHref, label: 'Volver' }}
          className="py-12"
        />
      </div>
    )
  }

  // El admin ve a todos los vendedores activos (puede asignarles) y sus tarjetas
  // enlazan al hub por-vendedor. El vendedor solo ve a quienes participaron.
  const activos = (todosVendedores ?? []).map((v) => ({ id: v.id, nombre: v.nombre }))
  const { porVendedor, porProducto, totales } = await calcularResumenDia(
    supabase,
    jornada.id,
    isAdmin ? activos : undefined,
  )

  const { data: pagasExistentes } = isAdmin
    ? await supabase.from('pagas').select('*').eq('jornada_id', jornada.id)
    : { data: [] }

  const cierreForm = isAdmin && (
    <CierreDiaForm
      jornadaId={jornada.id}
      efectivoTotal={totales.efectivo}
      montoAlcancia={jornada.monto_alcancia}
      valorAdicional={jornada.valor_adicional}
      pagasExistentes={(pagasExistentes ?? []).map((p) => ({
        id: p.id,
        persona: p.persona,
        monto: p.monto,
      }))}
      trabajadores={activos}
      isAdmin={isAdmin}
      isCerrada={jornada.estado === 'cerrada'}
    />
  )

  const hayParticipantes = porVendedor.some((v) => v.tieneAsignaciones)

  if (!hayParticipantes) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Resumen del día"
          subtitle={formatDate(actualFecha)}
          backHref={backHref}
          badge={badge}
        />
        <EmptyState
          title="Ningún vendedor ha registrado productos todavía."
          description="Los datos aparecerán aquí una vez que se asignen productos."
          className="py-10"
        />
        {cierreForm}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 stagger-children">
      <PageHeader
        title="Resumen del día"
        subtitle={formatDate(actualFecha)}
        backHref={backHref}
        badge={badge}
      />

      <DiaResumenView
        porVendedor={porVendedor}
        porProducto={porProducto}
        totales={totales}
        vendedorHrefPrefix={isAdmin ? `/jornada?fecha=${actualFecha}&vendedor=` : undefined}
      />

      {cierreForm}
    </div>
  )
}
