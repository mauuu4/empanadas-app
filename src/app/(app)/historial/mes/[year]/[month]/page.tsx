import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { Card, CardContent, CardTitle, Badge } from '@/components/ui'
import Link from 'next/link'

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export default async function HistorialMesPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>
}) {
  const { year: yearStr, month: monthStr } = await params
  const year = parseInt(yearStr)
  const month = parseInt(monthStr)

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <p className="text-gray-500">Fecha invalida.</p>
        <Link
          href="/historial"
          className="text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          &larr; Volver al historial
        </Link>
      </div>
    )
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Calculate date range for the month
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

  // Find all jornadas that fall within this month
  const { data: jornadas } = await supabase
    .from('jornadas')
    .select('*, semana_id')
    .gte('fecha', monthStart)
    .lt('fecha', monthEnd)
    .order('fecha', { ascending: true })

  // Aggregate per jornada
  let totalVentas = 0
  let totalGastos = 0
  let totalTransferencias = 0
  let totalDescuentos = 0
  let totalAlcancia = 0
  let totalPagas = 0
  let totalJornadas = 0

  for (const j of jornadas ?? []) {
    // Calculate venta for this jornada
    const { data: asignaciones } = await supabase
      .from('asignaciones')
      .select('cantidad_inicial, cantidad_sobrante, producto_id')
      .eq('jornada_id', j.id)

    const productoIds = [
      ...new Set((asignaciones ?? []).map((a) => a.producto_id)),
    ]

    let productosMap = new Map<string, { precio: number }>()
    if (productoIds.length > 0) {
      const { data: productos } = await supabase
        .from('productos')
        .select('id, precio')
        .in('id', productoIds)
      productosMap = new Map((productos ?? []).map((p) => [p.id, p]))
    }

    let ventaJornada = 0
    for (const asig of asignaciones ?? []) {
      const prod = productosMap.get(asig.producto_id)
      if (!prod || asig.cantidad_sobrante === null) continue
      const vendido = asig.cantidad_inicial - asig.cantidad_sobrante
      ventaJornada += vendido * prod.precio
    }

    const [{ data: gastos }, { data: transferencias }, { data: descuentos }] =
      await Promise.all([
        supabase.from('gastos').select('monto').eq('jornada_id', j.id),
        supabase.from('transferencias').select('monto').eq('jornada_id', j.id),
        supabase.from('descuentos').select('monto').eq('jornada_id', j.id),
      ])

    const { data: pagas } = await supabase
      .from('pagas')
      .select('monto')
      .eq('jornada_id', j.id)

    totalVentas += ventaJornada
    totalGastos += (gastos ?? []).reduce((s, g) => s + g.monto, 0)
    totalTransferencias += (transferencias ?? []).reduce(
      (s, t) => s + t.monto,
      0,
    )
    totalDescuentos += (descuentos ?? []).reduce((s, d) => s + d.monto, 0)
    totalAlcancia += j.monto_alcancia
    totalPagas += (pagas ?? []).reduce((s, p) => s + p.monto, 0)
    totalJornadas++
  }

  const totalEfectivo =
    totalVentas - totalGastos - totalTransferencias - totalDescuentos
  const totalSaldoDias = totalEfectivo - totalAlcancia - totalPagas

  // Find all unique semanas that have jornadas in this month
  const semanaIds = [...new Set((jornadas ?? []).map((j) => j.semana_id))]

  // Get inversiones for those semanas, but only ones dated within this month
  let totalInversiones = 0
  let totalGastosPersonales = 0
  type InversionItem = {
    id: string
    fecha: string
    descripcion: string
    monto: number
    tipo: string
  }
  const inversionesMes: InversionItem[] = []

  if (semanaIds.length > 0) {
    const { data: inversiones } = await supabase
      .from('inversiones')
      .select('*')
      .in('semana_id', semanaIds)
      .gte('fecha', monthStart)
      .lt('fecha', monthEnd)
      .order('fecha', { ascending: true })

    for (const inv of inversiones ?? []) {
      inversionesMes.push({
        id: inv.id,
        fecha: inv.fecha,
        descripcion: inv.descripcion,
        monto: inv.monto,
        tipo: inv.tipo,
      })
      if (inv.tipo === 'inversion') {
        totalInversiones += inv.monto
      } else {
        totalGastosPersonales += inv.monto
      }
    }
  }

  const saldoNetoMes = totalSaldoDias - totalInversiones - totalGastosPersonales

  // Weekly breakdown for the month
  type SemanaBreakdown = {
    id: string
    fechaInicio: string
    fechaFin: string
    ventaTotal: number
    jornadasCount: number
  }
  const semanasBreakdown: SemanaBreakdown[] = []

  if (semanaIds.length > 0) {
    const { data: semanas } = await supabase
      .from('semanas')
      .select('id, fecha_inicio, fecha_fin')
      .in('id', semanaIds)
      .order('fecha_inicio', { ascending: true })

    for (const s of semanas ?? []) {
      const jornadasSemana = (jornadas ?? []).filter(
        (j) => j.semana_id === s.id,
      )
      // Sum ventas already calculated above is global; recalculate per-week
      // We need the venta per week from jornadas in this month only
      let ventaSemana = 0
      for (const j of jornadasSemana) {
        const { data: asignaciones } = await supabase
          .from('asignaciones')
          .select('cantidad_inicial, cantidad_sobrante, producto_id')
          .eq('jornada_id', j.id)

        const productoIds = [
          ...new Set((asignaciones ?? []).map((a) => a.producto_id)),
        ]
        let productosMap = new Map<string, { precio: number }>()
        if (productoIds.length > 0) {
          const { data: productos } = await supabase
            .from('productos')
            .select('id, precio')
            .in('id', productoIds)
          productosMap = new Map((productos ?? []).map((p) => [p.id, p]))
        }

        for (const asig of asignaciones ?? []) {
          const prod = productosMap.get(asig.producto_id)
          if (!prod || asig.cantidad_sobrante === null) continue
          const vendido = asig.cantidad_inicial - asig.cantidad_sobrante
          ventaSemana += vendido * prod.precio
        }
      }

      semanasBreakdown.push({
        id: s.id,
        fechaInicio: s.fecha_inicio,
        fechaFin: s.fecha_fin,
        ventaTotal: ventaSemana,
        jornadasCount: jornadasSemana.length,
      })
    }
  }

  const promedioVentaDiaria =
    totalJornadas > 0 ? totalVentas / totalJornadas : 0

  return (
    <div className="flex flex-col gap-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Resumen mensual</h1>
          <p className="text-sm text-gray-500">
            {MESES[month - 1]} {year}
          </p>
        </div>
        <Link
          href="/historial"
          className="text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          &larr; Volver
        </Link>
      </div>

      {totalJornadas === 0 ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <p className="text-gray-500">
            No hay jornadas registradas en {MESES[month - 1]} {year}.
          </p>
        </div>
      ) : (
        <>
          {/* Saldo neto card */}
          <div className="rounded-xl bg-gray-900 p-4 text-white">
            <h3 className="mb-1 text-sm text-gray-400">Saldo neto del mes</h3>
            <p
              className={`text-2xl font-bold ${saldoNetoMes >= 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              {formatCurrency(saldoNetoMes)}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {totalJornadas} jornadas | Promedio diario:{' '}
              {formatCurrency(promedioVentaDiaria)}
            </p>
          </div>

          {/* Totales del mes */}
          <Card>
            <CardTitle>Totales del mes</CardTitle>
            <CardContent className="mt-2">
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total ventas</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(totalVentas)}
                  </span>
                </div>
                {totalGastos > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Total gastos vendedores</span>
                    <span>-{formatCurrency(totalGastos)}</span>
                  </div>
                )}
                {totalTransferencias > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Total transferencias</span>
                    <span>-{formatCurrency(totalTransferencias)}</span>
                  </div>
                )}
                {totalDescuentos > 0 && (
                  <div className="flex justify-between text-yellow-600">
                    <span>Total descuentos</span>
                    <span>-{formatCurrency(totalDescuentos)}</span>
                  </div>
                )}
                <div className="mt-1 flex justify-between border-t pt-1">
                  <span className="text-gray-600">Efectivo total</span>
                  <span className="font-medium">
                    {formatCurrency(totalEfectivo)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total alcancia</span>
                  <span className="font-medium text-blue-600">
                    {formatCurrency(totalAlcancia)}
                  </span>
                </div>
                {totalPagas > 0 && (
                  <div className="flex justify-between text-purple-600">
                    <span>Total pagas</span>
                    <span>-{formatCurrency(totalPagas)}</span>
                  </div>
                )}
                <div className="mt-1 flex justify-between border-t pt-1 font-medium">
                  <span>Saldo acumulado dias</span>
                  <span className="text-orange-600">
                    {formatCurrency(totalSaldoDias)}
                  </span>
                </div>
                {totalInversiones > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>(-) Inversiones</span>
                    <span>-{formatCurrency(totalInversiones)}</span>
                  </div>
                )}
                {totalGastosPersonales > 0 && (
                  <div className="flex justify-between text-purple-600">
                    <span>(-) Gastos personales</span>
                    <span>-{formatCurrency(totalGastosPersonales)}</span>
                  </div>
                )}
                <div className="mt-1 flex justify-between border-t pt-1 text-base font-bold">
                  <span>Saldo neto del mes</span>
                  <span
                    className={
                      saldoNetoMes >= 0 ? 'text-green-600' : 'text-red-600'
                    }
                  >
                    {formatCurrency(saldoNetoMes)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Desglose por semana */}
          <Card>
            <CardTitle>Semanas del mes</CardTitle>
            <CardContent className="mt-2">
              <div className="flex flex-col gap-2">
                {semanasBreakdown.map((s) => (
                  <Link
                    key={s.id}
                    href={`/historial/semana/${s.id}`}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-3 transition-colors hover:bg-gray-100"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-800">
                        {formatDateShort(s.fechaInicio)} -{' '}
                        {formatDateShort(s.fechaFin)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {s.jornadasCount} jornada
                        {s.jornadasCount !== 1 ? 's' : ''} en este mes
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(s.ventaTotal)}
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Inversiones del mes */}
          {inversionesMes.length > 0 && (
            <Card>
              <CardTitle>Inversiones y gastos del mes</CardTitle>
              <CardContent className="mt-2">
                <div className="flex flex-col gap-2">
                  {inversionesMes.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-800">
                          {inv.descripcion}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {formatDateShort(inv.fecha)}
                          </span>
                          <Badge
                            variant={
                              inv.tipo === 'inversion' ? 'default' : 'warning'
                            }
                          >
                            {inv.tipo === 'inversion'
                              ? 'Inversion'
                              : 'Gasto personal'}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-sm font-medium">
                        {formatCurrency(inv.monto)}
                      </span>
                    </div>
                  ))}

                  <div className="mt-1 flex flex-col gap-1 border-t pt-2 text-sm">
                    {totalInversiones > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total inversiones</span>
                        <span className="font-medium">
                          {formatCurrency(totalInversiones)}
                        </span>
                      </div>
                    )}
                    {totalGastosPersonales > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Total gastos personales
                        </span>
                        <span className="font-medium">
                          {formatCurrency(totalGastosPersonales)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
