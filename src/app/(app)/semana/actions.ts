'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { calcularResumenSemana } from '@/lib/queries'
import { getVendedor } from '@/lib/auth'
import { parseLocalDate } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(fecha: string, days: number): string {
  const d = parseLocalDate(fecha)
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

type CerrarSemanaResult = { ok: true; movidas: number } | { ok: false; error: string }

/**
 * Cierra una semana hasta la fecha indicada (fechaFin).
 * - Recalcula el saldo final usando SOLO las jornadas dentro de rango (fecha <= fechaFin).
 * - Marca la semana como cerrada y ajusta su fecha_fin.
 * - Las jornadas posteriores a fechaFin se mueven a una semana nueva (que arranca al
 *   día siguiente) con el saldo final como saldo inicial.
 */
export async function cerrarSemana(
  semanaId: string,
  fechaFin: string,
): Promise<CerrarSemanaResult> {
  const vendedor = await getVendedor()
  if (!vendedor || vendedor.rol !== 'admin') {
    return { ok: false, error: 'No autorizado' }
  }

  const admin = await createAdminClient()

  const { data: semana } = await admin
    .from('semanas')
    .select('*')
    .eq('id', semanaId)
    .single()

  if (!semana) return { ok: false, error: 'Semana no encontrada' }
  if (semana.estado === 'cerrada') return { ok: false, error: 'La semana ya está cerrada' }

  // Saldo final considerando solo jornadas dentro de rango (las inversiones son semanales)
  const resumen = await calcularResumenSemana(admin, semanaId, semana.saldo_inicial)
  const inRangeSaldoDia = resumen.jornadas
    .filter((j) => j.fecha <= fechaFin)
    .reduce((s, j) => s + j.saldoDia, 0)
  const saldoFinal =
    semana.saldo_inicial +
    inRangeSaldoDia -
    resumen.totalInversiones -
    resumen.totalGastosPersonales -
    resumen.totalGastosGenerales

  // Cerrar la semana ajustando su fecha de fin
  const { error: updateError } = await admin
    .from('semanas')
    .update({ estado: 'cerrada', fecha_fin: fechaFin })
    .eq('id', semanaId)

  if (updateError) return { ok: false, error: updateError.message }

  // Jornadas fuera de rango → mover a una semana nueva
  const { data: jornadas } = await admin
    .from('jornadas')
    .select('id, fecha')
    .eq('semana_id', semanaId)

  const fueraDeRango = (jornadas ?? []).filter((j) => j.fecha > fechaFin)

  if (fueraDeRango.length === 0) {
    revalidatePath('/semana')
    return { ok: true, movidas: 0 }
  }

  const nextInicio = addDays(fechaFin, 1)
  const nextFinDefault = addDays(nextInicio, 6)
  const maxFecha = fueraDeRango.reduce(
    (m, j) => (j.fecha > m ? j.fecha : m),
    nextInicio,
  )
  const nextFin = maxFecha > nextFinDefault ? maxFecha : nextFinDefault

  // Find-or-create la semana destino (por si ya existe una con ese inicio)
  let nuevaSemanaId: string
  const { data: existente } = await admin
    .from('semanas')
    .select('id')
    .eq('fecha_inicio', nextInicio)
    .maybeSingle()

  if (existente) {
    nuevaSemanaId = existente.id
    await admin
      .from('semanas')
      .update({ saldo_inicial: saldoFinal, fecha_fin: nextFin, estado: 'abierta' })
      .eq('id', nuevaSemanaId)
  } else {
    const { data: nueva, error: insertError } = await admin
      .from('semanas')
      .insert({
        fecha_inicio: nextInicio,
        fecha_fin: nextFin,
        saldo_inicial: saldoFinal,
        estado: 'abierta',
      })
      .select('id')
      .single()

    if (insertError || !nueva) {
      return { ok: false, error: insertError?.message ?? 'No se pudo crear la semana nueva' }
    }
    nuevaSemanaId = nueva.id
  }

  const { error: moveError } = await admin
    .from('jornadas')
    .update({ semana_id: nuevaSemanaId })
    .in(
      'id',
      fueraDeRango.map((j) => j.id),
    )

  if (moveError) return { ok: false, error: moveError.message }

  revalidatePath('/semana')
  return { ok: true, movidas: fueraDeRango.length }
}
