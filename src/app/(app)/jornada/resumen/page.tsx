import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { today, formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardContent, CardTitle } from '@/components/ui'
import { CierreDiaForm } from '@/components/jornada/CierreDiaForm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ResumenPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const vendedorId = user.user_metadata.vendedor_id as string
  const fechaHoy = today()

  const { data: vendedor } = await supabase
    .from('vendedores')
    .select('rol')
    .eq('id', vendedorId)
    .single()

  const isAdmin = vendedor?.rol === 'admin'

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

  // Buscar todos los vendedores activos (para el select de pagas)
  const { data: todosVendedores } = await supabase
    .from('vendedores')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  // Buscar todos los vendedores que tienen asignaciones hoy
  const { data: asignaciones } = await supabase
    .from('asignaciones')
    .select('vendedor_id, cantidad_inicial, cantidad_sobrante, producto_id')
    .eq('jornada_id', jornada.id)

  // Obtener vendedores unicos
  const vendedorIds = [
    ...new Set((asignaciones ?? []).map((a) => a.vendedor_id)),
  ]

  if (vendedorIds.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Resumen del dia</h1>
            <p className="text-sm capitalize text-gray-500">
              {formatDate(fechaHoy)}
            </p>
          </div>
          <Link
            href="/jornada"
            className="text-sm font-medium text-orange-600 hover:text-orange-700"
          >
            &larr; Volver
          </Link>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="mb-4 text-gray-500">
              Ningun vendedor ha registrado productos todavia.
            </p>
          </CardContent>
        </Card>

        {isAdmin && (
          <CierreDiaForm
            jornadaId={jornada.id}
            efectivoTotal={0}
            montoAlcancia={jornada.monto_alcancia}
            valorAdicional={jornada.valor_adicional}
            pagasExistentes={[]}
            trabajadores={(todosVendedores ?? []).map((v) => ({
              id: v.id,
              nombre: v.nombre,
            }))}
            isAdmin={isAdmin}
            isCerrada={jornada.estado === 'cerrada'}
          />
        )}
      </div>
    )
  }

  // Buscar datos de vendedores
  const { data: vendedores } = await supabase
    .from('vendedores')
    .select('id, nombre')
    .in('id', vendedorIds)

  // Buscar productos
  const productoIds = [
    ...new Set((asignaciones ?? []).map((a) => a.producto_id)),
  ]
  const { data: productos } = await supabase
    .from('productos')
    .select('id, nombre, precio')
    .in('id', productoIds)

  const productosMap = new Map((productos ?? []).map((p) => [p.id, p]))
  const vendedoresMap = new Map((vendedores ?? []).map((v) => [v.id, v]))

  // Buscar movimientos por vendedor
  const [{ data: gastos }, { data: transferencias }, { data: descuentos }] =
    await Promise.all([
      supabase
        .from('gastos')
        .select('vendedor_id, monto')
        .eq('jornada_id', jornada.id),
      supabase
        .from('transferencias')
        .select('vendedor_id, monto')
        .eq('jornada_id', jornada.id),
      supabase
        .from('descuentos')
        .select('vendedor_id, monto')
        .eq('jornada_id', jornada.id),
    ])

  // Buscar pagas existentes
  const { data: pagasExistentes } = await supabase
    .from('pagas')
    .select('*')
    .eq('jornada_id', jornada.id)

  // Calcular resumen por vendedor
  type VendedorResumen = {
    nombre: string
    ventaBruta: number
    gastos: number
    transferencias: number
    descuentos: number
    efectivo: number
    hasCerrado: boolean
  }

  const resumenPorVendedor: VendedorResumen[] = vendedorIds.map((vid) => {
    const vendedorData = vendedoresMap.get(vid)
    const vendedorAsignaciones = (asignaciones ?? []).filter(
      (a) => a.vendedor_id === vid,
    )

    let ventaBruta = 0
    let hasCerrado = true

    for (const asig of vendedorAsignaciones) {
      const prod = productosMap.get(asig.producto_id)
      if (!prod) continue

      if (asig.cantidad_sobrante === null) {
        hasCerrado = false
        continue
      }

      const vendido = asig.cantidad_inicial - asig.cantidad_sobrante
      ventaBruta += vendido * prod.precio
    }

    const totalGastos = (gastos ?? [])
      .filter((g) => g.vendedor_id === vid)
      .reduce((sum, g) => sum + g.monto, 0)

    const totalTransf = (transferencias ?? [])
      .filter((t) => t.vendedor_id === vid)
      .reduce((sum, t) => sum + t.monto, 0)

    const totalDesc = (descuentos ?? [])
      .filter((d) => d.vendedor_id === vid)
      .reduce((sum, d) => sum + d.monto, 0)

    const efectivo = ventaBruta - totalGastos - totalTransf - totalDesc

    return {
      nombre: vendedorData?.nombre ?? 'Desconocido',
      ventaBruta,
      gastos: totalGastos,
      transferencias: totalTransf,
      descuentos: totalDesc,
      efectivo,
      hasCerrado,
    }
  })

  // Totales
  const totales = resumenPorVendedor.reduce(
    (acc, v) => ({
      ventaBruta: acc.ventaBruta + v.ventaBruta,
      gastos: acc.gastos + v.gastos,
      transferencias: acc.transferencias + v.transferencias,
      descuentos: acc.descuentos + v.descuentos,
      efectivo: acc.efectivo + v.efectivo,
    }),
    {
      ventaBruta: 0,
      gastos: 0,
      transferencias: 0,
      descuentos: 0,
      efectivo: 0,
    },
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Resumen del dia</h1>
          <p className="text-sm capitalize text-gray-500">
            {formatDate(fechaHoy)}
          </p>
        </div>
        <Link
          href="/jornada"
          className="text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          &larr; Volver
        </Link>
      </div>

      {/* Resumen por vendedor */}
      {resumenPorVendedor.map((v) => (
        <Card key={v.nombre}>
          <div className="flex items-center justify-between">
            <CardTitle>{v.nombre}</CardTitle>
            {!v.hasCerrado && (
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                Sin cerrar
              </span>
            )}
          </div>
          <CardContent className="mt-2">
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Venta bruta</span>
                <span className="font-medium">
                  {formatCurrency(v.ventaBruta)}
                </span>
              </div>
              {v.gastos > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Gastos</span>
                  <span>-{formatCurrency(v.gastos)}</span>
                </div>
              )}
              {v.transferencias > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>Transferencias</span>
                  <span>-{formatCurrency(v.transferencias)}</span>
                </div>
              )}
              {v.descuentos > 0 && (
                <div className="flex justify-between text-yellow-600">
                  <span>Descuentos</span>
                  <span>-{formatCurrency(v.descuentos)}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between border-t pt-1 font-medium">
                <span>Efectivo</span>
                <span className="text-orange-600">
                  {formatCurrency(v.efectivo)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Totales */}
      <div className="rounded-xl bg-gray-900 p-4 text-white">
        <h3 className="mb-3 font-semibold">Totales del dia</h3>
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-300">Venta total</span>
            <span className="font-medium">
              {formatCurrency(totales.ventaBruta)}
            </span>
          </div>
          {totales.gastos > 0 && (
            <div className="flex justify-between text-red-300">
              <span>Total gastos</span>
              <span>-{formatCurrency(totales.gastos)}</span>
            </div>
          )}
          {totales.transferencias > 0 && (
            <div className="flex justify-between text-blue-300">
              <span>Total transferencias</span>
              <span>-{formatCurrency(totales.transferencias)}</span>
            </div>
          )}
          {totales.descuentos > 0 && (
            <div className="flex justify-between text-yellow-300">
              <span>Total descuentos</span>
              <span>-{formatCurrency(totales.descuentos)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-gray-700 pt-2 text-base font-bold">
            <span>Efectivo total</span>
            <span className="text-orange-400">
              {formatCurrency(totales.efectivo)}
            </span>
          </div>
        </div>
      </div>

      {/* Cierre del dia (admin only) */}
      {isAdmin && (
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
          trabajadores={(todosVendedores ?? []).map((v) => ({
            id: v.id,
            nombre: v.nombre,
          }))}
          isAdmin={isAdmin}
          isCerrada={jornada.estado === 'cerrada'}
        />
      )}
    </div>
  )
}
