import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { DIAS_SEMANA } from '@/lib/constants'

export type JornadaResumen = {
  fecha: string
  dia: string
  estado: string
  ventaTotal: number
  valorAdicional: number
  totalGastos: number
  totalTransferencias: number
  totalDescuentos: number
  efectivoTotal: number
  alcancia: number
  totalPagas: number
  saldoDia: number
}

export type SemanaResumen = {
  jornadas: JornadaResumen[]
  totales: {
    ventaTotal: number
    totalGastos: number
    totalTransferencias: number
    totalDescuentos: number
    efectivoTotal: number
    alcancia: number
    totalPagas: number
    saldoDia: number
  }
  totalInversiones: number
  totalGastosPersonales: number
  saldoActual: number
  inversiones: {
    id: string
    fecha: string
    descripcion: string
    monto: number
    tipo: string
  }[]
}

/**
 * Map JS Date.getDay() (0=Sun...6=Sat) to business week index
 * (0=viernes, 1=sabado, 2=domingo, 3=lunes, 4=martes, 5=miercoles, 6=jueves)
 */
function getDiaSemana(fecha: string): string {
  const d = new Date(fecha + 'T00:00:00')
  const jsDay = d.getDay()
  // JS: 0=dom, 1=lun, 2=mar, 3=mie, 4=jue, 5=vie, 6=sab
  // Biz: 0=vie, 1=sab, 2=dom, 3=lun, 4=mar, 5=mie, 6=jue
  const map: Record<number, number> = {
    0: 2, // domingo
    1: 3, // lunes
    2: 4, // martes
    3: 5, // miercoles
    4: 6, // jueves
    5: 0, // viernes
    6: 1, // sabado
  }
  return DIAS_SEMANA[map[jsDay]]
}

/**
 * Calculate the full weekly summary for a given semana.
 * Used by both /semana (current week) and /historial/semana/[id] (past weeks).
 */
export async function calcularResumenSemana(
  supabase: SupabaseClient<Database>,
  semanaId: string,
  saldoInicial: number,
): Promise<SemanaResumen> {
  // Buscar todas las jornadas de esta semana
  const { data: jornadas } = await supabase
    .from('jornadas')
    .select('*')
    .eq('semana_id', semanaId)
    .order('fecha', { ascending: true })

  const jornadasResumen: JornadaResumen[] = []

  for (const j of jornadas ?? []) {
    const { data: asignaciones } = await supabase
      .from('asignaciones')
      .select('vendedor_id, cantidad_inicial, cantidad_sobrante, producto_id')
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

    let ventaTotal = 0
    for (const asig of asignaciones ?? []) {
      const prod = productosMap.get(asig.producto_id)
      if (!prod || asig.cantidad_sobrante === null) continue
      const vendido = asig.cantidad_inicial - asig.cantidad_sobrante
      ventaTotal += vendido * prod.precio
    }

    const [{ data: gastos }, { data: transferencias }, { data: descuentos }] =
      await Promise.all([
        supabase.from('gastos').select('monto').eq('jornada_id', j.id),
        supabase.from('transferencias').select('monto').eq('jornada_id', j.id),
        supabase.from('descuentos').select('monto').eq('jornada_id', j.id),
      ])

    const totalGastos = (gastos ?? []).reduce((sum, g) => sum + g.monto, 0)
    const totalTransf = (transferencias ?? []).reduce(
      (sum, t) => sum + t.monto,
      0,
    )
    const totalDesc = (descuentos ?? []).reduce((sum, d) => sum + d.monto, 0)
    const efectivoTotal = ventaTotal + j.valor_adicional - totalGastos - totalTransf - totalDesc

    const { data: pagas } = await supabase
      .from('pagas')
      .select('monto')
      .eq('jornada_id', j.id)

    const totalPagas = (pagas ?? []).reduce((sum, p) => sum + p.monto, 0)
    const saldoDia = efectivoTotal - j.monto_alcancia - totalPagas

    jornadasResumen.push({
      fecha: j.fecha,
      dia: getDiaSemana(j.fecha),
      estado: j.estado,
      ventaTotal,
      valorAdicional: j.valor_adicional,
      totalGastos,
      totalTransferencias: totalTransf,
      totalDescuentos: totalDesc,
      efectivoTotal,
      alcancia: j.monto_alcancia,
      totalPagas,
      saldoDia,
    })
  }

  const totales = jornadasResumen.reduce(
    (acc, j) => ({
      ventaTotal: acc.ventaTotal + j.ventaTotal,
      totalGastos: acc.totalGastos + j.totalGastos,
      totalTransferencias: acc.totalTransferencias + j.totalTransferencias,
      totalDescuentos: acc.totalDescuentos + j.totalDescuentos,
      efectivoTotal: acc.efectivoTotal + j.efectivoTotal,
      alcancia: acc.alcancia + j.alcancia,
      totalPagas: acc.totalPagas + j.totalPagas,
      saldoDia: acc.saldoDia + j.saldoDia,
    }),
    {
      ventaTotal: 0,
      totalGastos: 0,
      totalTransferencias: 0,
      totalDescuentos: 0,
      efectivoTotal: 0,
      alcancia: 0,
      totalPagas: 0,
      saldoDia: 0,
    },
  )

  const { data: inversiones } = await supabase
    .from('inversiones')
    .select('*')
    .eq('semana_id', semanaId)
    .order('fecha', { ascending: true })

  const totalInversiones = (inversiones ?? [])
    .filter((i) => i.tipo === 'inversion')
    .reduce((sum, i) => sum + i.monto, 0)

  const totalGastosPersonales = (inversiones ?? [])
    .filter((i) => i.tipo === 'gasto_personal')
    .reduce((sum, i) => sum + i.monto, 0)

  const saldoActual =
    saldoInicial + totales.saldoDia - totalInversiones - totalGastosPersonales

  return {
    jornadas: jornadasResumen,
    totales,
    totalInversiones,
    totalGastosPersonales,
    saldoActual,
    inversiones: (inversiones ?? []).map((i) => ({
      id: i.id,
      fecha: i.fecha,
      descripcion: i.descripcion,
      monto: i.monto,
      tipo: i.tipo,
    })),
  }
}
