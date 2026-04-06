import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { today } from '@/lib/utils'
import { CerrarVentaForm } from '@/components/jornada/CerrarVentaForm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function CerrarPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const vendedorId = user.user_metadata.vendedor_id as string
  const fechaHoy = today()

  const { data: jornada } = await supabase
    .from('jornadas')
    .select('*')
    .eq('fecha', fechaHoy)
    .single()

  if (!jornada) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
          <svg className="h-7 w-7 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="font-medium text-gray-500">No hay jornada creada para hoy.</p>
        <Link
          href="/jornada"
          className="flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
          Volver a jornada
        </Link>
      </div>
    )
  }

  const { data: asignacionesRaw } = await supabase
    .from('asignaciones')
    .select('id, producto_id, cantidad_inicial, cantidad_sobrante')
    .eq('jornada_id', jornada.id)
    .eq('vendedor_id', vendedorId)

  if (!asignacionesRaw || asignacionesRaw.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
          <svg className="h-7 w-7 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
        </div>
        <p className="font-medium text-gray-500">No tienes productos asignados para hoy.</p>
        <Link
          href="/jornada/asignar"
          className="flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          Asignar productos
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
        </Link>
      </div>
    )
  }

  const productoIds = asignacionesRaw.map((a) => a.producto_id)
  const { data: productos } = await supabase
    .from('productos')
    .select('*')
    .in('id', productoIds)

  const productosMap = new Map((productos ?? []).map((p) => [p.id, p]))

  const asignaciones = asignacionesRaw
    .map((a) => ({
      ...a,
      producto: productosMap.get(a.producto_id)!,
    }))
    .filter((a) => a.producto)

  const [{ data: gastos }, { data: transferencias }, { data: descuentos }] =
    await Promise.all([
      supabase
        .from('gastos')
        .select('monto')
        .eq('jornada_id', jornada.id)
        .eq('vendedor_id', vendedorId),
      supabase
        .from('transferencias')
        .select('monto')
        .eq('jornada_id', jornada.id)
        .eq('vendedor_id', vendedorId),
      supabase
        .from('descuentos')
        .select('monto')
        .eq('jornada_id', jornada.id)
        .eq('vendedor_id', vendedorId),
    ])

  const totalGastos = (gastos ?? []).reduce((sum, g) => sum + g.monto, 0)
  const totalTransferencias = (transferencias ?? []).reduce(
    (sum, t) => sum + t.monto,
    0,
  )
  const totalDescuentos = (descuentos ?? []).reduce(
    (sum, d) => sum + d.monto,
    0,
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Cerrar venta</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            Registra tus sobrantes para cerrar
          </p>
        </div>
        <Link
          href="/jornada"
          className="flex items-center gap-1 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
          Volver
        </Link>
      </div>

      <CerrarVentaForm
        asignaciones={asignaciones}
        jornadaId={jornada.id}
        vendedorId={vendedorId}
        totalGastos={totalGastos}
        totalTransferencias={totalTransferencias}
        totalDescuentos={totalDescuentos}
      />
    </div>
  )
}
