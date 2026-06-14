import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCurrentJornadaDate, buildAdminQuery } from '@/lib/utils'
import { MovimientosForm } from '@/components/jornada/MovimientosForm'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { getUser, getVendedor } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; vendedor?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const [user, vendedor] = await Promise.all([getUser(), getVendedor()])

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

  const { data: movimientos } = await supabase
    .from('movimientos')
    .select('*')
    .eq('jornada_id', jornada.id)
    .eq('vendedor_id', actualVendedorId)
    .order('created_at', { ascending: true })

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Movimientos"
        subtitle="Gastos, transferencias y descuentos"
        backHref={backHref}
      />

      <MovimientosForm
        jornadaId={jornada.id}
        vendedorId={actualVendedorId}
        movimientos={movimientos ?? []}
      />
    </div>
  )
}
