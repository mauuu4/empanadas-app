import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { getUser } from '@/lib/auth'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

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
      <div className="flex flex-col gap-5">
        <PageHeader title="Resumen mensual" backHref="/historial" backLabel="Historial" />
        <EmptyState
          title="Fecha invalida."
          action={{ href: '/historial', label: 'Volver al historial' }}
          className="py-12"
        />
      </div>
    )
  }

  const supabase = await createClient()

  const user = await getUser()
  if (!user) redirect('/login')

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

  const { data: jornadas } = await supabase
    .from('jornadas')
    .select('*, semana_id')
    .gte('fecha', monthStart)
    .lt('fecha', monthEnd)
    .order('fecha', { ascending: true })

  let totalVentas = 0
  let totalGastos = 0
  let totalTransferencias = 0
  let totalDescuentos = 0
  let totalAlcancia = 0
  let totalPagas = 0
  let totalJornadas = 0

  for (const j of jornadas ?? []) {
    const { data: asignaciones } = await supabase
      .from('asignaciones')
      .select('cantidad_inicial, cantidad_sobrante, producto_id')
      .eq('jornada_id', j.id)

    const productoIds = [...new Set((asignaciones ?? []).map((a) => a.producto_id))]

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
    totalTransferencias += (transferencias ?? []).reduce((s, t) => s + t.monto, 0)
    totalDescuentos += (descuentos ?? []).reduce((s, d) => s + d.monto, 0)
    totalAlcancia += j.monto_alcancia
    totalPagas += (pagas ?? []).reduce((s, p) => s + p.monto, 0)
    totalJornadas++
  }

  const totalEfectivo = totalVentas - totalGastos - totalTransferencias - totalDescuentos
  const totalSaldoDias = totalEfectivo - totalAlcancia - totalPagas

  const semanaIds = [...new Set((jornadas ?? []).map((j) => j.semana_id))]

  let totalInversiones = 0
  let totalGastosPersonales = 0
  let totalGastosGenerales = 0
  type InversionItem = { id: string; fecha: string; descripcion: string; monto: number; tipo: string }
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
      inversionesMes.push({ id: inv.id, fecha: inv.fecha, descripcion: inv.descripcion, monto: inv.monto, tipo: inv.tipo })
      if (inv.tipo === 'inversion') {
        totalInversiones += inv.monto
      } else if (inv.tipo === 'gasto_general') {
        totalGastosGenerales += inv.monto
      } else {
        totalGastosPersonales += inv.monto
      }
    }
  }

  const saldoNetoMes =
    totalSaldoDias - totalInversiones - totalGastosGenerales - totalGastosPersonales

  type SemanaBreakdown = { id: string; fechaInicio: string; fechaFin: string; ventaTotal: number; jornadasCount: number }
  const semanasBreakdown: SemanaBreakdown[] = []

  if (semanaIds.length > 0) {
    const { data: semanas } = await supabase
      .from('semanas')
      .select('id, fecha_inicio, fecha_fin')
      .in('id', semanaIds)
      .order('fecha_inicio', { ascending: true })

    for (const s of semanas ?? []) {
      const jornadasSemana = (jornadas ?? []).filter((j) => j.semana_id === s.id)
      let ventaSemana = 0
      for (const j of jornadasSemana) {
        const { data: asignaciones } = await supabase
          .from('asignaciones')
          .select('cantidad_inicial, cantidad_sobrante, producto_id')
          .eq('jornada_id', j.id)

        const productoIds = [...new Set((asignaciones ?? []).map((a) => a.producto_id))]
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
          ventaSemana += (asig.cantidad_inicial - asig.cantidad_sobrante) * prod.precio
        }
      }
      semanasBreakdown.push({ id: s.id, fechaInicio: s.fecha_inicio, fechaFin: s.fecha_fin, ventaTotal: ventaSemana, jornadasCount: jornadasSemana.length })
    }
  }

  const promedioVentaDiaria = totalJornadas > 0 ? totalVentas / totalJornadas : 0
  const mesLabel = `${MESES[month - 1]} ${year}`

  return (
    <div className="flex flex-col gap-5 stagger-children">
      <PageHeader
        title="Resumen mensual"
        subtitle={mesLabel}
        backHref="/historial"
        backLabel="Historial"
      />

      {totalJornadas === 0 ? (
        <EmptyState
          title={`No hay jornadas en ${mesLabel}.`}
          action={{ href: '/historial', label: 'Volver al historial' }}
          className="py-12"
        />
      ) : (
        <>
          {/* Saldo neto */}
          <div className="rounded-2xl bg-gradient-dark p-5 shadow-elevated">
            <p className="text-xs font-medium text-warm-400">Saldo neto del mes</p>
            <p className={`mt-1 font-display text-3xl font-bold tracking-tight ${saldoNetoMes >= 0 ? 'text-white' : 'text-red-300'}`}>
              {formatCurrency(saldoNetoMes)}
            </p>
            <p className="mt-2 text-xs text-warm-500">
              {totalJornadas} jornadas · Promedio diario: {formatCurrency(promedioVentaDiaria)}
            </p>
          </div>

          {/* Totales del mes */}
          <Card>
            <CardTitle>Totales del mes</CardTitle>
            <CardContent className="mt-3">
              <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-warm-500">Total ventas</span>
                  <span className="font-semibold text-warm-900">{formatCurrency(totalVentas)}</span>
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
                  <div className="flex justify-between text-amber-600">
                    <span>Total descuentos</span>
                    <span>-{formatCurrency(totalDescuentos)}</span>
                  </div>
                )}
                <div className="mt-1 flex justify-between border-t border-warm-200/60 pt-1.5">
                  <span className="text-warm-500">Efectivo total</span>
                  <span className="font-semibold text-warm-900">{formatCurrency(totalEfectivo)}</span>
                </div>
                {totalAlcancia > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Total alcancia</span>
                    <span className="font-semibold">{formatCurrency(totalAlcancia)}</span>
                  </div>
                )}
                {totalPagas > 0 && (
                  <div className="flex justify-between text-violet-600">
                    <span>Total pagas</span>
                    <span>-{formatCurrency(totalPagas)}</span>
                  </div>
                )}
                <div className="mt-1 flex justify-between border-t border-warm-200/60 pt-1.5 font-bold text-warm-900">
                  <span>Saldo acumulado dias</span>
                  <span className={totalSaldoDias >= 0 ? 'text-orange-600' : 'text-red-600'}>
                    {formatCurrency(totalSaldoDias)}
                  </span>
                </div>
                {totalInversiones > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>(-) Inversiones</span>
                    <span>-{formatCurrency(totalInversiones)}</span>
                  </div>
                )}
                {totalGastosGenerales > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>(-) Gastos generales</span>
                    <span>-{formatCurrency(totalGastosGenerales)}</span>
                  </div>
                )}
                {totalGastosPersonales > 0 && (
                  <div className="flex justify-between text-violet-600">
                    <span>(-) Gastos personales</span>
                    <span>-{formatCurrency(totalGastosPersonales)}</span>
                  </div>
                )}
                <div className="mt-1 flex justify-between border-t border-warm-200/60 pt-1.5 text-base font-bold">
                  <span>Saldo neto del mes</span>
                  <span className={saldoNetoMes >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                    {formatCurrency(saldoNetoMes)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Desglose por semana */}
          <Card>
            <CardTitle>Semanas del mes</CardTitle>
            <CardContent className="mt-3">
              <div className="flex flex-col gap-2">
                {semanasBreakdown.map((s) => (
                  <Link
                    key={s.id}
                    href={`/historial/semana/${s.id}`}
                    className="flex items-center justify-between rounded-xl bg-warm-50/80 px-3.5 py-3 transition-all duration-150 hover:bg-warm-100/80 active:scale-[0.99]"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-warm-800">
                        {formatDateShort(s.fechaInicio)} — {formatDateShort(s.fechaFin)}
                      </span>
                      <span className="text-[11px] text-warm-400">
                        {s.jornadasCount} jornada{s.jornadasCount !== 1 ? 's' : ''} en este mes
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-warm-900">
                        {formatCurrency(s.ventaTotal)}
                      </span>
                      <svg className="h-4 w-4 text-warm-300" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Inversiones del mes */}
          {inversionesMes.length > 0 && (
            <Card>
              <CardTitle>Inversiones y gastos del mes</CardTitle>
              <CardContent className="mt-3">
                <div className="flex flex-col gap-2">
                  {inversionesMes.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between rounded-xl bg-warm-50/80 px-3.5 py-3"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-warm-800">{inv.descripcion}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-warm-400">{formatDateShort(inv.fecha)}</span>
                          <Badge variant={inv.tipo === 'inversion' ? 'default' : 'warning'}>
                            {inv.tipo === 'inversion'
                              ? 'Inversion'
                              : inv.tipo === 'gasto_general'
                                ? 'Gasto general'
                                : 'Gasto personal'}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-warm-900">
                        {formatCurrency(inv.monto)}
                      </span>
                    </div>
                  ))}

                  <div className="mt-1 rounded-xl bg-warm-50/80 p-3.5">
                    <div className="flex flex-col gap-1.5 text-sm">
                      {totalInversiones > 0 && (
                        <div className="flex justify-between">
                          <span className="text-warm-500">Total inversiones</span>
                          <span className="font-semibold text-warm-900">{formatCurrency(totalInversiones)}</span>
                        </div>
                      )}
                      {totalGastosGenerales > 0 && (
                        <div className="flex justify-between">
                          <span className="text-warm-500">Total gastos generales</span>
                          <span className="font-semibold text-warm-900">{formatCurrency(totalGastosGenerales)}</span>
                        </div>
                      )}
                      {totalGastosPersonales > 0 && (
                        <div className="flex justify-between">
                          <span className="text-warm-500">Total gastos personales</span>
                          <span className="font-semibold text-warm-900">{formatCurrency(totalGastosPersonales)}</span>
                        </div>
                      )}
                    </div>
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
