/**
 * Script: fix-semana.mjs
 *
 * Objetivo:
 *  1. Encontrar la semana actualmente ABIERTA
 *  2. Actualizar su fecha_fin a 2026-05-14 y cambiar su estado a 'cerrada'
 *  3. Reasignar las jornadas de los días 14, 16, 17 y 18 que estén en esa semana
 *     a una semana NUEVA con fecha_inicio 2026-05-14 y fecha_fin 2026-05-18
 *
 * Uso: node scripts/fix-semana.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

// Cargar .env.local
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line) => {
      const idx = line.indexOf('=')
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
    })
)

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ─── Fechas relevantes ───────────────────────────────────────────────────────
const FECHA_CIERRE_VIEJA = '2026-05-14'  // fecha_fin de la semana que se cierra
const NUEVA_FECHA_INICIO  = '2026-05-14'
const NUEVA_FECHA_FIN     = '2026-05-18'
const DIAS_NUEVOS = ['2026-05-14', '2026-05-16', '2026-05-17', '2026-05-18']

async function main() {
  console.log('=== Fix semana: iniciando ===\n')

  // 1. Buscar semana abierta
  const { data: semanaAbierta, error: errBuscar } = await supabase
    .from('semanas')
    .select('*')
    .eq('estado', 'abierta')
    .order('fecha_inicio', { ascending: false })
    .limit(1)
    .single()

  if (errBuscar || !semanaAbierta) {
    console.error('❌ No se encontró ninguna semana abierta:', errBuscar?.message)
    process.exit(1)
  }

  console.log(`✅ Semana abierta encontrada:`)
  console.log(`   ID:          ${semanaAbierta.id}`)
  console.log(`   Inicio:      ${semanaAbierta.fecha_inicio}`)
  console.log(`   Fin:         ${semanaAbierta.fecha_fin}`)
  console.log(`   Saldo inic.: ${semanaAbierta.saldo_inicial}`)

  // 2. Ver jornadas actuales en esa semana
  const { data: jornadasExistentes } = await supabase
    .from('jornadas')
    .select('id, fecha, estado')
    .eq('semana_id', semanaAbierta.id)
    .order('fecha', { ascending: true })

  console.log(`\n📋 Jornadas en la semana actual (${jornadasExistentes?.length ?? 0}):`)
  jornadasExistentes?.forEach((j) =>
    console.log(`   ${j.fecha} [${j.estado}]  id=${j.id}`)
  )

  // 3. Actualizar la semana vieja: fecha_fin = 14 may y cerrar
  console.log(`\n🔒 Cerrando semana vieja con fecha_fin=${FECHA_CIERRE_VIEJA}...`)
  const { error: errCerrar } = await supabase
    .from('semanas')
    .update({
      fecha_fin: FECHA_CIERRE_VIEJA,
      estado: 'cerrada',
    })
    .eq('id', semanaAbierta.id)

  if (errCerrar) {
    console.error('❌ Error al cerrar la semana vieja:', errCerrar.message)
    process.exit(1)
  }
  console.log('   ✅ Semana vieja cerrada correctamente.')

  // 4. Calcular saldo final de la semana vieja para usarlo como saldo_inicial de la nueva
  const { data: saldoData } = await supabase.rpc('calcular_saldo_semanal', {
    p_semana_id: semanaAbierta.id,
  })
  const saldoInicial = saldoData?.[0]?.saldo_actual ?? 0
  console.log(`\n💰 Saldo final de la semana cerrada (= saldo inicial de la nueva): ${saldoInicial}`)

  // 5. Crear la nueva semana
  console.log(`\n🆕 Creando nueva semana [${NUEVA_FECHA_INICIO} → ${NUEVA_FECHA_FIN}]...`)
  const { data: nuevaSemana, error: errCrear } = await supabase
    .from('semanas')
    .insert({
      fecha_inicio: NUEVA_FECHA_INICIO,
      fecha_fin: NUEVA_FECHA_FIN,
      saldo_inicial: saldoInicial,
      estado: 'abierta',
    })
    .select('*')
    .single()

  if (errCrear || !nuevaSemana) {
    console.error('❌ Error al crear la nueva semana:', errCrear?.message)
    process.exit(1)
  }
  console.log(`   ✅ Nueva semana creada. ID: ${nuevaSemana.id}`)

  // 6. Reasignar jornadas de los días 14, 16, 17 y 18 a la nueva semana
  //    Hay que buscar cuáles ya existen en la semana vieja y reasignarlas;
  //    las que no existan las creamos.
  console.log(`\n📅 Procesando jornadas para los días: ${DIAS_NUEVOS.join(', ')}`)

  for (const fecha of DIAS_NUEVOS) {
    // ¿Existe ya esta jornada? (puede estar en la semana vieja o en ningún lado)
    const { data: jornadaExistente } = await supabase
      .from('jornadas')
      .select('*')
      .eq('fecha', fecha)
      .single()

    if (jornadaExistente) {
      if (jornadaExistente.semana_id === nuevaSemana.id) {
        console.log(`   ↩️  ${fecha}: ya está en la nueva semana, nada que hacer.`)
        continue
      }
      // Reasignar a la nueva semana
      const { error: errReasignar } = await supabase
        .from('jornadas')
        .update({ semana_id: nuevaSemana.id })
        .eq('id', jornadaExistente.id)

      if (errReasignar) {
        console.error(`   ❌ ${fecha}: error al reasignar:`, errReasignar.message)
      } else {
        console.log(`   ✅ ${fecha}: reasignada de semana_vieja → nueva semana.`)
      }
    } else {
      // Crear jornada nueva para este día
      const { error: errNuevaJornada } = await supabase
        .from('jornadas')
        .insert({ semana_id: nuevaSemana.id, fecha })

      if (errNuevaJornada) {
        console.error(`   ❌ ${fecha}: error al crear jornada:`, errNuevaJornada.message)
      } else {
        console.log(`   ✅ ${fecha}: jornada creada en la nueva semana.`)
      }
    }
  }

  // 7. Resumen final
  const { data: jornadasNuevas } = await supabase
    .from('jornadas')
    .select('id, fecha, estado')
    .eq('semana_id', nuevaSemana.id)
    .order('fecha', { ascending: true })

  console.log(`\n📊 Estado final de la nueva semana (${jornadasNuevas?.length ?? 0} jornadas):`)
  jornadasNuevas?.forEach((j) =>
    console.log(`   ${j.fecha} [${j.estado}]  id=${j.id}`)
  )

  console.log('\n🎉 ¡Listo! Semana corregida exitosamente.')
}

main().catch((err) => {
  console.error('Error inesperado:', err)
  process.exit(1)
})
