import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate, formatDateShort } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { CierreDiaForm } from '@/components/jornada/CierreDiaForm'
import { DiaResumenView } from '@/components/jornada/DiaResumenView'
import { ensureJornadaForDate } from '@/lib/jornada-utils'
import { calcularResumenDia } from '@/lib/queries'
import { getVendedor } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AdminJornadaFechaPage({
  params,
}: {
  params: Promise<{ fecha: string }>
}) {
  const { fecha } = await params

  const vendedor = await getVendedor()
  if (!vendedor || vendedor.rol !== 'admin') redirect('/dashboard')

  const adminClient = await createAdminClient()

  const [{ jornada }, { data: vendedores }] = await Promise.all([
    ensureJornadaForDate(adminClient, fecha),
    adminClient
      .from('vendedores')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre', { ascending: true }),
  ])

  const isCerrada = jornada?.estado === 'cerrada'

  if (!jornada) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title={formatDate(fecha)} backHref="/semana" backLabel="Semana" />
        <EmptyState
          title="No se pudo crear la jornada para esta fecha."
          action={{ href: '/semana', label: 'Volver' }}
          className="py-12"
        />
      </div>
    )
  }

  const activos = (vendedores ?? []).map((v) => ({ id: v.id, nombre: v.nombre }))

  const [resumen, { data: pagasExistentes }] = await Promise.all([
    calcularResumenDia(adminClient, jornada.id, activos),
    adminClient.from('pagas').select('*').eq('jornada_id', jornada.id),
  ])

  return (
    <div className="flex flex-col gap-5 stagger-children">
      <PageHeader
        title={formatDate(fecha).split(',')[0].trim()}
        subtitle={formatDateShort(fecha)}
        backHref="/semana"
        backLabel="Semana"
        badge={
          <Badge variant={isCerrada ? 'default' : 'success'}>
            {isCerrada ? 'Cerrada' : 'En curso'}
          </Badge>
        }
      />

      <DiaResumenView
        porVendedor={resumen.porVendedor}
        porProducto={resumen.porProducto}
        totales={resumen.totales}
        vendedorHrefPrefix={`/jornada?fecha=${fecha}&vendedor=`}
      />

      {/* Cierre del día */}
      <CierreDiaForm
        jornadaId={jornada.id}
        efectivoTotal={resumen.totales.efectivo}
        montoAlcancia={jornada.monto_alcancia}
        valorAdicional={jornada.valor_adicional}
        pagasExistentes={(pagasExistentes ?? []).map((p) => ({
          id: p.id,
          persona: p.persona,
          monto: p.monto,
        }))}
        trabajadores={activos}
        isAdmin={true}
        isCerrada={isCerrada}
      />
    </div>
  )
}
