import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate, formatDateShort } from '@/lib/utils'
import { Badge } from '@/components/ui'
import { JornadaEditor } from '@/components/historial/JornadaEditor'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function HistorialJornadaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const vendedorId = user.user_metadata.vendedor_id as string
  const { data: usuario } = await supabase
    .from('vendedores')
    .select('rol')
    .eq('id', vendedorId)
    .single()

  if (usuario?.rol !== 'admin') redirect('/historial')

  const { data: jornada } = await supabase
    .from('jornadas')
    .select('*')
    .eq('id', id)
    .single()

  if (!jornada) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <p className="text-gray-500">Jornada no encontrada.</p>
        <Link
          href="/historial"
          className="text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          &larr; Volver al historial
        </Link>
      </div>
    )
  }

  const { data: semana } = await supabase
    .from('semanas')
    .select('id, estado, fecha_inicio, fecha_fin')
    .eq('id', jornada.semana_id)
    .single()

  if (!semana) redirect('/historial')

  const semanaCerrada = semana.estado === 'cerrada'

  // Cargar asignaciones, productos y vendedores
  const { data: asignaciones } = await supabase
    .from('asignaciones')
    .select('id, vendedor_id, producto_id, cantidad_inicial, cantidad_sobrante')
    .eq('jornada_id', jornada.id)

  const productoIds = [
    ...new Set((asignaciones ?? []).map((a) => a.producto_id)),
  ]
  const vendedorIds = [
    ...new Set((asignaciones ?? []).map((a) => a.vendedor_id)),
  ]

  const [{ data: productos }, { data: vendedores }, { data: todosVendedores }] =
    await Promise.all([
      productoIds.length > 0
        ? supabase
            .from('productos')
            .select('*')
            .in('id', productoIds)
            .order('orden', { ascending: true })
        : Promise.resolve({ data: [] }),
      vendedorIds.length > 0
        ? supabase
            .from('vendedores')
            .select('id, nombre')
            .in('id', vendedorIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from('vendedores')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre', { ascending: true }),
    ])

  const productosMap = new Map(
    (productos ?? []).map((p) => [p.id, p]),
  )

  // Cargar movimientos y pagas
  const [
    { data: gastos },
    { data: transferencias },
    { data: descuentos },
    { data: pagas },
  ] = await Promise.all([
    supabase.from('gastos').select('*').eq('jornada_id', jornada.id),
    supabase.from('transferencias').select('*').eq('jornada_id', jornada.id),
    supabase.from('descuentos').select('*').eq('jornada_id', jornada.id),
    supabase.from('pagas').select('*').eq('jornada_id', jornada.id),
  ])

  // Construir datos por vendedor
  const vendedoresData = (vendedores ?? []).map((v) => {
    const vAsignaciones = (asignaciones ?? [])
      .filter((a) => a.vendedor_id === v.id)
      .map((a) => ({
        ...a,
        producto: productosMap.get(a.producto_id)!,
      }))
      .filter((a) => a.producto)

    return {
      id: v.id,
      nombre: v.nombre,
      asignaciones: vAsignaciones,
      gastos: (gastos ?? []).filter((g) => g.vendedor_id === v.id),
      transferencias: (transferencias ?? []).filter(
        (t) => t.vendedor_id === v.id,
      ),
      descuentos: (descuentos ?? []).filter((d) => d.vendedor_id === v.id),
    }
  })

  // Calcular efectivo total
  const efectivoTotal = vendedoresData.reduce((sum, v) => {
    const ventaBruta = v.asignaciones.reduce((s, a) => {
      if (a.cantidad_sobrante === null) return s
      return s + (a.cantidad_inicial - a.cantidad_sobrante) * a.producto.precio
    }, 0)
    const totalGastos = v.gastos.reduce((s, g) => s + g.monto, 0)
    const totalTransf = v.transferencias.reduce((s, t) => s + t.monto, 0)
    const totalDesc = v.descuentos.reduce((s, d) => s + d.monto, 0)
    return sum + ventaBruta - totalGastos - totalTransf - totalDesc
  }, 0)

  return (
    <div className="flex flex-col gap-5 stagger-children">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Editar jornada
          </h1>
          <p className="mt-0.5 text-sm capitalize text-gray-400">
            {formatDate(jornada.fecha)}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-400">
            Semana {formatDateShort(semana.fecha_inicio)} -{' '}
            {formatDateShort(semana.fecha_fin)}{' '}
            <Badge
              variant={semanaCerrada ? 'default' : 'success'}
            >
              {semanaCerrada ? 'cerrada' : 'abierta'}
            </Badge>
          </p>
        </div>
        <Link
          href={`/historial/semana/${semana.id}`}
          className="flex items-center gap-1 text-sm font-medium text-gray-400 transition-colors hover:text-gray-600"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
              clipRule="evenodd"
            />
          </svg>
          Volver
        </Link>
      </div>

      {semanaCerrada && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-200/60">
          La semana esta cerrada. Solo puedes ver los datos en modo lectura.
        </div>
      )}

      <JornadaEditor
        jornadaId={jornada.id}
        fechaJornada={jornada.fecha}
        semanaId={semana.id}
        semanaCerrada={semanaCerrada}
        jornadaCerrada={jornada.estado === 'cerrada'}
        vendedoresData={vendedoresData}
        todosVendedores={todosVendedores ?? []}
        pagasExistentes={pagas ?? []}
        montoAlcancia={jornada.monto_alcancia}
        valorAdicional={jornada.valor_adicional}
        efectivoTotal={efectivoTotal}
      />
    </div>
  )
}
