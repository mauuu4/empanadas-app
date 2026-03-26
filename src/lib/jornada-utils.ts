import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { today } from '@/lib/utils'

/**
 * Ensures a jornada exists for today. Logic:
 * 1. If a jornada for today already exists (open or closed) → return it
 * 2. If no jornada exists for today → auto-create one (and auto-create semana if needed)
 *
 * This replaces the manual "Crear jornada" button.
 */
export async function ensureJornadaHoy(
  supabase: SupabaseClient<Database>,
): Promise<{
  jornada: Database['public']['Tables']['jornadas']['Row'] | null
  semana: Database['public']['Tables']['semanas']['Row'] | null
  error?: string
}> {
  const fechaHoy = today()

  // 1. Check if a jornada for today already exists
  const { data: jornadaExistente } = await supabase
    .from('jornadas')
    .select('*')
    .eq('fecha', fechaHoy)
    .single()

  if (jornadaExistente) {
    // Jornada already exists (open or closed) - get its semana
    const { data: semana } = await supabase
      .from('semanas')
      .select('*')
      .eq('id', jornadaExistente.semana_id)
      .single()

    return { jornada: jornadaExistente, semana }
  }

  // 2. No jornada for today - auto-create it

  // First, find or create the semana
  let semanaId: string | null = null

  // Check for an open semana
  const { data: semanaAbierta } = await supabase
    .from('semanas')
    .select('*')
    .eq('estado', 'abierta')
    .order('fecha_inicio', { ascending: false })
    .limit(1)
    .single()

  if (semanaAbierta) {
    semanaId = semanaAbierta.id
  } else {
    // No open semana - create a new one
    // Calculate the Friday (start) and Thursday (end) of the current business week
    const now = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' }),
    )
    const dayOfWeek = now.getDay() // 0=dom, 1=lun, ..., 5=vie, 6=sab
    const daysFromFriday = (dayOfWeek + 2) % 7
    const viernes = new Date(now)
    viernes.setDate(now.getDate() - daysFromFriday)
    const jueves = new Date(viernes)
    jueves.setDate(viernes.getDate() + 6)

    const fechaInicio = viernes.toISOString().split('T')[0]
    const fechaFin = jueves.toISOString().split('T')[0]

    // Get saldo from last closed semana
    let saldoInicial = 0
    const { data: semanaAnterior } = await supabase
      .from('semanas')
      .select('*')
      .eq('estado', 'cerrada')
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .single()

    if (semanaAnterior) {
      const { data: saldoData } = await supabase.rpc(
        'calcular_saldo_semanal',
        { p_semana_id: semanaAnterior.id },
      )
      if (saldoData && saldoData.length > 0) {
        saldoInicial = saldoData[0].saldo_actual
      }
    }

    const { data: nuevaSemana, error: semanaError } = await supabase
      .from('semanas')
      .insert({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        saldo_inicial: saldoInicial,
      })
      .select()
      .single()

    if (semanaError) {
      return { jornada: null, semana: null, error: semanaError.message }
    }

    semanaId = nuevaSemana.id
  }

  // Create the jornada
  const { data: nuevaJornada, error: jornadaError } = await supabase
    .from('jornadas')
    .insert({
      semana_id: semanaId,
      fecha: fechaHoy,
    })
    .select()
    .single()

  if (jornadaError) {
    // If the error is a unique constraint violation, someone else created it first
    if (jornadaError.code === '23505') {
      const { data: jornada } = await supabase
        .from('jornadas')
        .select('*')
        .eq('fecha', fechaHoy)
        .single()

      const { data: semana } = await supabase
        .from('semanas')
        .select('*')
        .eq('id', semanaId)
        .single()

      return { jornada, semana }
    }
    return { jornada: null, semana: null, error: jornadaError.message }
  }

  const { data: semana } = await supabase
    .from('semanas')
    .select('*')
    .eq('id', semanaId)
    .single()

  return { jornada: nuevaJornada, semana }
}
