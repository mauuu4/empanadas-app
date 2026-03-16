import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { today } from '@/lib/utils'
import { CerrarVentaForm } from '@/components/jornada/CerrarVentaForm'
import Link from 'next/link'

export default async function CerrarPage() {
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

  // Buscar asignaciones del vendedor con datos de producto
  const { data: asignacionesRaw } = await supabase
    .from('asignaciones')
    .select('id, producto_id, cantidad_inicial, cantidad_sobrante')
    .eq('jornada_id', jornada.id)
    .eq('vendedor_id', vendedorId)

  if (!asignacionesRaw || asignacionesRaw.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <p className="text-gray-500">No tienes productos asignados para hoy.</p>
        <Link
          href="/jornada/asignar"
          className="text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          Asignar productos &rarr;
        </Link>
      </div>
    )
  }

  // Buscar los productos correspondientes
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

  // Buscar totales de movimientos
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cerrar venta</h1>
          <p className="text-sm text-gray-500">
            Registra tus sobrantes para cerrar
          </p>
        </div>
        <Link
          href="/jornada"
          className="text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          &larr; Volver
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
