import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { today } from '@/lib/utils'
import { MovimientosForm } from '@/components/jornada/MovimientosForm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function MovimientosPage() {
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

  // Buscar movimientos existentes de este vendedor
  const [{ data: gastos }, { data: transferencias }, { data: descuentos }] =
    await Promise.all([
      supabase
        .from('gastos')
        .select('*')
        .eq('jornada_id', jornada.id)
        .eq('vendedor_id', vendedorId)
        .order('created_at', { ascending: true }),
      supabase
        .from('transferencias')
        .select('*')
        .eq('jornada_id', jornada.id)
        .eq('vendedor_id', vendedorId)
        .order('created_at', { ascending: true }),
      supabase
        .from('descuentos')
        .select('*')
        .eq('jornada_id', jornada.id)
        .eq('vendedor_id', vendedorId)
        .order('created_at', { ascending: true }),
    ])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Movimientos</h1>
          <p className="text-sm text-gray-500">
            Gastos, transferencias y descuentos
          </p>
        </div>
        <Link
          href="/jornada"
          className="text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          &larr; Volver
        </Link>
      </div>

      <MovimientosForm
        jornadaId={jornada.id}
        vendedorId={vendedorId}
        gastos={gastos ?? []}
        transferencias={transferencias ?? []}
        descuentos={descuentos ?? []}
      />
    </div>
  )
}
