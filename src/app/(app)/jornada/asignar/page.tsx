import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { today } from '@/lib/utils'
import { AsignarProductosForm } from '@/components/jornada/AsignarProductosForm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AsignarPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const vendedorId = user.user_metadata.vendedor_id as string
  const fechaHoy = today()

  // Buscar jornada del dia
  const { data: jornada } = await supabase
    .from('jornadas')
    .select('*')
    .eq('fecha', fechaHoy)
    .single()

  if (!jornada) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <p className="text-gray-500">No hay jornada creada para hoy.</p>
        <Link
          href="/jornada"
          className="text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          &larr; Volver a jornada
        </Link>
      </div>
    )
  }

  // Buscar productos activos
  const { data: productos } = await supabase
    .from('productos')
    .select('*')
    .eq('activo', true)
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true })

  // Buscar asignaciones existentes de este vendedor
  const { data: asignaciones } = await supabase
    .from('asignaciones')
    .select('*')
    .eq('jornada_id', jornada.id)
    .eq('vendedor_id', vendedorId)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Asignar productos</h1>
          <p className="text-sm text-gray-500">
            Registra las bandejas que llevas
          </p>
        </div>
        <Link
          href="/jornada"
          className="text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          &larr; Volver
        </Link>
      </div>

      <AsignarProductosForm
        productos={productos ?? []}
        asignaciones={asignaciones ?? []}
        jornadaId={jornada.id}
        vendedorId={vendedorId}
      />
    </div>
  )
}
