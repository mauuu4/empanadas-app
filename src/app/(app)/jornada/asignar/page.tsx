import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCurrentJornadaDate, buildAdminQuery } from '@/lib/utils'
import { AsignarProductosForm } from '@/components/jornada/AsignarProductosForm'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { getUser, getVendedor } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AsignarPage({
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

  const [{ data: productos }, { data: asignaciones }] = await Promise.all([
    supabase
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true }),
    supabase
      .from('asignaciones')
      .select('*')
      .eq('jornada_id', jornada.id)
      .eq('vendedor_id', actualVendedorId),
  ])

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Asignar productos"
        subtitle="Registra las bandejas que llevas"
        backHref={backHref}
      />

      <AsignarProductosForm
        productos={productos ?? []}
        asignaciones={asignaciones ?? []}
        jornadaId={jornada.id}
        vendedorId={actualVendedorId}
        isAdmin={isAdmin}
      />
    </div>
  )
}
