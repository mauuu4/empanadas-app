import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getCurrentJornadaDate, parseLocalDate } from '@/lib/utils'

type JornadaRow = Database['public']['Tables']['jornadas']['Row']
type SemanaRow = Database['public']['Tables']['semanas']['Row']

interface JornadaResult {
  jornada: JornadaRow | null
  semana: SemanaRow | null
  error?: string
}

/**
 * Calculate the business-week boundaries (Friday → Thursday) for a given date.
 */
function getBusinessWeekRange(date: Date): { fechaInicio: string; fechaFin: string } {
  const dayOfWeek = date.getDay() // 0=dom, 1=lun, ..., 5=vie, 6=sab
  const daysFromFriday = (dayOfWeek + 2) % 7
  const viernes = new Date(date)
  viernes.setDate(date.getDate() - daysFromFriday)
  const jueves = new Date(viernes)
  jueves.setDate(viernes.getDate() + 6)

  return {
    fechaInicio: viernes.toISOString().split('T')[0],
    fechaFin: jueves.toISOString().split('T')[0],
  }
}

/**
 * Get the saldo_actual from the last closed semana, or 0 if none exists.
 */
async function getSaldoFromLastSemana(
  supabase: SupabaseClient<Database>,
): Promise<number> {
  const { data: semanaAnterior } = await supabase
    .from('semanas')
    .select('id')
    .eq('estado', 'cerrada')
    .order('fecha_inicio', { ascending: false })
    .limit(1)
    .single()

  if (!semanaAnterior) return 0

  const { data: saldoData } = await supabase.rpc('calcular_saldo_semanal', {
    p_semana_id: semanaAnterior.id,
  })

  return saldoData?.[0]?.saldo_actual ?? 0
}

/**
 * Encuentra la semana correcta para una jornada (por fecha) o crea una nueva.
 *
 * Orden de resolución:
 * 1. Si ya existe una semana cuyo rango [fecha_inicio, fecha_fin] contiene la fecha,
 *    se usa esa (abierta o cerrada) — evita duplicados y respeta semanas pasadas.
 * 2. Si hay una semana ABIERTA que empezó antes/igual a esta fecha, se reutiliza
 *    (las jornadas se acumulan; el cierre manual con fecha de fin las separará si
 *    corresponden a una semana nueva). Esto preserva la cadena de saldo.
 * 3. Si no, se crea una semana nueva con el rango de negocio de esa fecha.
 */
async function findOrCreateSemana(
  supabase: SupabaseClient<Database>,
  fecha: string,
): Promise<{ semanaId: string; error?: string }> {
  // 1. ¿Existe una semana cuyo rango contiene la fecha?
  const { data: cubriente } = await supabase
    .from('semanas')
    .select('id')
    .lte('fecha_inicio', fecha)
    .gte('fecha_fin', fecha)
    .order('fecha_inicio', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (cubriente) {
    return { semanaId: cubriente.id }
  }

  // 2. ¿Hay una semana abierta que empezó antes o en esta fecha? (acumular)
  const { data: semanaAbierta } = await supabase
    .from('semanas')
    .select('id')
    .eq('estado', 'abierta')
    .lte('fecha_inicio', fecha)
    .order('fecha_inicio', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (semanaAbierta) {
    return { semanaId: semanaAbierta.id }
  }

  // 3. Crear una semana nueva con el rango de negocio de esta fecha
  const { fechaInicio, fechaFin } = getBusinessWeekRange(parseLocalDate(fecha))
  const saldoInicial = await getSaldoFromLastSemana(supabase)

  const { data: nuevaSemana, error: semanaError } = await supabase
    .from('semanas')
    .insert({ fecha_inicio: fechaInicio, fecha_fin: fechaFin, saldo_inicial: saldoInicial })
    .select('id')
    .single()

  if (semanaError) {
    return { semanaId: '', error: semanaError.message }
  }

  return { semanaId: nuevaSemana.id }
}

/**
 * Create a jornada record, handling race conditions via unique constraint.
 */
async function createJornada(
  supabase: SupabaseClient<Database>,
  semanaId: string,
  fecha: string,
): Promise<JornadaResult> {
  const { data: nuevaJornada, error: jornadaError } = await supabase
    .from('jornadas')
    .insert({ semana_id: semanaId, fecha })
    .select()
    .single()

  if (jornadaError) {
    // Unique constraint violation → someone else created it first
    if (jornadaError.code === '23505') {
      const { data: jornada } = await supabase
        .from('jornadas')
        .select('*')
        .eq('fecha', fecha)
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

/**
 * Ensures a jornada exists for today. Logic:
 * 1. If a jornada for today already exists (open or closed) → return it
 * 2. If no jornada exists for today → auto-create one (and auto-create semana if needed)
 *
 * This replaces the manual "Crear jornada" button.
 */
export async function ensureJornadaHoy(
  supabase: SupabaseClient<Database>,
): Promise<JornadaResult> {
  return ensureJornadaForDate(supabase, getCurrentJornadaDate())
}

/**
 * Ensures a jornada exists for the given date.
 * Used by ensureJornadaHoy (today) and admin manual registration (any date).
 */
export async function ensureJornadaForDate(
  supabase: SupabaseClient<Database>,
  fecha: string,
): Promise<JornadaResult> {
  // 1. Check if a jornada for this date already exists
  const { data: jornadaExistente } = await supabase
    .from('jornadas')
    .select('*')
    .eq('fecha', fecha)
    .single()

  if (jornadaExistente) {
    const { data: semana } = await supabase
      .from('semanas')
      .select('*')
      .eq('id', jornadaExistente.semana_id)
      .single()

    return { jornada: jornadaExistente, semana }
  }

  // 2. No jornada — find or create semana (según la fecha objetivo), then create jornada
  const { semanaId, error: semanaError } = await findOrCreateSemana(supabase, fecha)

  if (semanaError) {
    return { jornada: null, semana: null, error: semanaError }
  }

  return createJornada(supabase, semanaId, fecha)
}
