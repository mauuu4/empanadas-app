import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { DIAS_SEMANA } from '@/lib/constants'
import { parseLocalDate } from '@/lib/utils'

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
  totalGastosGenerales: number
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
  const d = parseLocalDate(fecha)
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
  // Fetch jornadas and inversiones in parallel (async-parallel)
  const [{ data: jornadas }, { data: inversiones }] = await Promise.all([
    supabase
      .from('jornadas')
      .select('*')
      .eq('semana_id', semanaId)
      .order('fecha', { ascending: true }),
    supabase
      .from('inversiones')
      .select('*')
      .eq('semana_id', semanaId)
      .order('fecha', { ascending: true }),
  ])

  const jornadaIds = (jornadas ?? []).map((j) => j.id)

  // Fetch ALL related data for ALL jornadas in parallel (eliminates N+1).
  // gastos/transferencias/descuentos viven en una sola tabla `movimientos`.
  const [{ data: allAsignaciones }, { data: allMovimientos }, { data: allPagas }] =
    jornadaIds.length > 0
      ? await Promise.all([
          supabase
            .from('asignaciones')
            .select(
              'jornada_id, vendedor_id, cantidad_inicial, cantidad_sobrante, producto_id',
            )
            .in('jornada_id', jornadaIds),
          supabase
            .from('movimientos')
            .select('jornada_id, tipo, monto')
            .in('jornada_id', jornadaIds),
          supabase
            .from('pagas')
            .select('jornada_id, monto')
            .in('jornada_id', jornadaIds),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }]

  // Fetch all unique productos in one query
  const productoIds = [
    ...new Set((allAsignaciones ?? []).map((a) => a.producto_id)),
  ]
  const productosMap = new Map<string, { precio: number }>()
  if (productoIds.length > 0) {
    const { data: productos } = await supabase
      .from('productos')
      .select('id, precio')
      .in('id', productoIds)
    for (const p of productos ?? []) {
      productosMap.set(p.id, p)
    }
  }

  // Build index maps for O(1) lookups (js-index-maps)
  type Asignacion = NonNullable<typeof allAsignaciones>[number]
  const asignacionesByJornada = new Map<string, Asignacion[]>()
  for (const a of allAsignaciones ?? []) {
    const list = asignacionesByJornada.get(a.jornada_id)
    if (list) list.push(a)
    else asignacionesByJornada.set(a.jornada_id, [a])
  }

  // Un solo recorrido sobre movimientos, separando por tipo (js-combine-iterations)
  const gastosByJornada = new Map<string, number>()
  const transfByJornada = new Map<string, number>()
  const descByJornada = new Map<string, number>()
  for (const m of allMovimientos ?? []) {
    const map =
      m.tipo === 'gasto'
        ? gastosByJornada
        : m.tipo === 'transferencia'
          ? transfByJornada
          : descByJornada
    map.set(m.jornada_id, (map.get(m.jornada_id) ?? 0) + m.monto)
  }

  const pagasByJornada = new Map<string, number>()
  for (const p of allPagas ?? []) {
    pagasByJornada.set(
      p.jornada_id,
      (pagasByJornada.get(p.jornada_id) ?? 0) + p.monto,
    )
  }

  // Calculate resumen per jornada (no more queries)
  const jornadasResumen: JornadaResumen[] = (jornadas ?? []).map((j) => {
    const asignaciones = asignacionesByJornada.get(j.id) ?? []
    let ventaTotal = 0
    for (const asig of asignaciones) {
      const prod = productosMap.get(asig.producto_id)
      if (!prod || asig.cantidad_sobrante === null) continue
      const vendido = asig.cantidad_inicial - asig.cantidad_sobrante
      ventaTotal += vendido * prod.precio
    }

    const totalGastos = gastosByJornada.get(j.id) ?? 0
    const totalTransf = transfByJornada.get(j.id) ?? 0
    const totalDesc = descByJornada.get(j.id) ?? 0
    const efectivoTotal =
      ventaTotal + j.valor_adicional - totalGastos - totalTransf - totalDesc
    const totalPagas = pagasByJornada.get(j.id) ?? 0
    const saldoDia = efectivoTotal - j.monto_alcancia - totalPagas

    return {
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
    }
  })

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

  // Single pass over inversiones (js-combine-iterations)
  let totalInversiones = 0
  let totalGastosPersonales = 0
  let totalGastosGenerales = 0
  for (const i of inversiones ?? []) {
    if (i.tipo === 'inversion') totalInversiones += i.monto
    else if (i.tipo === 'gasto_personal') totalGastosPersonales += i.monto
    else if (i.tipo === 'gasto_general') totalGastosGenerales += i.monto
  }

  const saldoActual =
    saldoInicial +
    totales.saldoDia -
    totalInversiones -
    totalGastosPersonales -
    totalGastosGenerales

  return {
    jornadas: jornadasResumen,
    totales,
    totalInversiones,
    totalGastosPersonales,
    totalGastosGenerales,
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

export type VendedorResumenDia = {
  vendedorId: string
  nombre: string
  ventaBruta: number
  gastos: number
  transferencias: number
  descuentos: number
  efectivo: number
  pendienteDeCierre: boolean
  tieneAsignaciones: boolean
}

export type ProductoResumenDia = {
  productoId: string
  nombre: string
  precio: number
  llevadas: number
  sobrantes: number
  vendidas: number
}

export type DiaResumen = {
  porVendedor: VendedorResumenDia[]
  porProducto: ProductoResumenDia[]
  totales: {
    ventaBruta: number
    gastos: number
    transferencias: number
    descuentos: number
    efectivo: number
  }
}

/**
 * Calcula el resumen consolidado de una jornada (día): desglose por vendedor,
 * agregado por producto (llevado vs. sobrante) y totales del día.
 * Usado por /jornada/resumen y /admin/jornadas/[fecha].
 *
 * @param todosLosVendedores lista de vendedores activos para incluir incluso
 *   a los que aún no tienen asignaciones (útil para el hub admin del día).
 */
export async function calcularResumenDia(
  supabase: SupabaseClient<Database>,
  jornadaId: string,
  todosLosVendedores?: { id: string; nombre: string }[],
): Promise<DiaResumen> {
  // Traer asignaciones + movimientos en paralelo (async-parallel).
  // gastos/transferencias/descuentos ahora son una sola tabla `movimientos`.
  const [{ data: asignaciones }, { data: movimientos }] = await Promise.all([
    supabase
      .from('asignaciones')
      .select('vendedor_id, producto_id, cantidad_inicial, cantidad_sobrante')
      .eq('jornada_id', jornadaId),
    supabase
      .from('movimientos')
      .select('vendedor_id, tipo, monto')
      .eq('jornada_id', jornadaId),
  ])

  const asigs = asignaciones ?? []

  // Productos y vendedores únicos
  const productoIds = [...new Set(asigs.map((a) => a.producto_id))]
  const vendedorIdsConAsig = [...new Set(asigs.map((a) => a.vendedor_id))]

  // Vendedores a incluir: todos los activos (si se pasan) o solo los que tienen asignaciones
  const vendedorIds = todosLosVendedores
    ? todosLosVendedores.map((v) => v.id)
    : vendedorIdsConAsig

  const [productosMap, nombresMap] = await Promise.all([
    (async () => {
      const map = new Map<string, { precio: number; nombre: string; orden: number }>()
      if (productoIds.length > 0) {
        const { data: productos } = await supabase
          .from('productos')
          .select('id, nombre, precio, orden')
          .in('id', productoIds)
        for (const p of productos ?? []) {
          map.set(p.id, { precio: p.precio, nombre: p.nombre, orden: p.orden })
        }
      }
      return map
    })(),
    (async () => {
      const map = new Map<string, string>()
      if (todosLosVendedores) {
        for (const v of todosLosVendedores) map.set(v.id, v.nombre)
      } else if (vendedorIdsConAsig.length > 0) {
        const { data: vendedores } = await supabase
          .from('vendedores')
          .select('id, nombre')
          .in('id', vendedorIdsConAsig)
        for (const v of vendedores ?? []) map.set(v.id, v.nombre)
      }
      return map
    })(),
  ])

  // Index maps O(1): un solo recorrido sobre movimientos, separando por tipo
  const gastosByVendedor = new Map<string, number>()
  const transfByVendedor = new Map<string, number>()
  const descByVendedor = new Map<string, number>()
  for (const m of movimientos ?? []) {
    const map =
      m.tipo === 'gasto'
        ? gastosByVendedor
        : m.tipo === 'transferencia'
          ? transfByVendedor
          : descByVendedor
    map.set(m.vendedor_id, (map.get(m.vendedor_id) ?? 0) + m.monto)
  }

  type Asig = (typeof asigs)[number]
  const asigsByVendedor = new Map<string, Asig[]>()
  for (const a of asigs) {
    const list = asigsByVendedor.get(a.vendedor_id)
    if (list) list.push(a)
    else asigsByVendedor.set(a.vendedor_id, [a])
  }

  // Resumen por vendedor
  const porVendedor: VendedorResumenDia[] = vendedorIds.map((vid) => {
    const vAsigs = asigsByVendedor.get(vid) ?? []
    let ventaBruta = 0
    let pendienteDeCierre = false
    for (const a of vAsigs) {
      const prod = productosMap.get(a.producto_id)
      if (a.cantidad_sobrante === null) {
        pendienteDeCierre = true
        continue
      }
      if (!prod) continue
      ventaBruta += (a.cantidad_inicial - a.cantidad_sobrante) * prod.precio
    }
    const g = gastosByVendedor.get(vid) ?? 0
    const t = transfByVendedor.get(vid) ?? 0
    const d = descByVendedor.get(vid) ?? 0
    return {
      vendedorId: vid,
      nombre: nombresMap.get(vid) ?? 'Desconocido',
      ventaBruta,
      gastos: g,
      transferencias: t,
      descuentos: d,
      efectivo: ventaBruta - g - t - d,
      pendienteDeCierre,
      tieneAsignaciones: vAsigs.length > 0,
    }
  })

  // Agregado por producto (todos los vendedores)
  const productoAgg = new Map<string, { llevadas: number; sobrantes: number }>()
  for (const a of asigs) {
    const agg = productoAgg.get(a.producto_id) ?? { llevadas: 0, sobrantes: 0 }
    agg.llevadas += a.cantidad_inicial
    agg.sobrantes += a.cantidad_sobrante ?? 0
    productoAgg.set(a.producto_id, agg)
  }

  const porProductoConOrden = [...productoAgg.entries()].map(([productoId, agg]) => {
    const prod = productosMap.get(productoId)
    return {
      productoId,
      nombre: prod?.nombre ?? 'Producto',
      precio: prod?.precio ?? 0,
      orden: prod?.orden ?? 0,
      llevadas: agg.llevadas,
      sobrantes: agg.sobrantes,
      vendidas: agg.llevadas - agg.sobrantes,
    }
  })
  porProductoConOrden.sort(
    (a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre),
  )
  const porProducto: ProductoResumenDia[] = porProductoConOrden.map((p) => ({
    productoId: p.productoId,
    nombre: p.nombre,
    precio: p.precio,
    llevadas: p.llevadas,
    sobrantes: p.sobrantes,
    vendidas: p.vendidas,
  }))

  const totales = porVendedor.reduce(
    (acc, v) => ({
      ventaBruta: acc.ventaBruta + v.ventaBruta,
      gastos: acc.gastos + v.gastos,
      transferencias: acc.transferencias + v.transferencias,
      descuentos: acc.descuentos + v.descuentos,
      efectivo: acc.efectivo + v.efectivo,
    }),
    { ventaBruta: 0, gastos: 0, transferencias: 0, descuentos: 0, efectivo: 0 },
  )

  return { porVendedor, porProducto, totales }
}
