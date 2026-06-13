/**
 * Script: fix-semana-v2.mjs
 *
 * Corrige el error anterior:
 *  - Semana VIEJA (77ff9a18): debe tener fecha_fin=2026-05-14 con los días del 08 al 14 (jueves)
 *  - Semana NUEVA (88c2dcde): debe tener fecha_inicio=2026-05-15, con los días 15, 16, 17, 18
 *
 * Correcciones:
 *  1. Reasignar jornada 2026-05-14 de vuelta a la semana vieja
 *  2. Reasignar jornada 2026-05-15 de la semana vieja a la nueva semana
 *  3. Actualizar fecha_inicio de la nueva semana a 2026-05-15
 */

import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envContent = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8')
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'])

const ID_SEMANA_VIEJA = '77ff9a18-c50c-46d3-a68b-b3bfc49c5b56'
const ID_SEMANA_NUEVA = '88c2dcde-9557-4027-a5af-1fc8a03ba52d'

async function main() {
  console.log('=== Fix semana v2: iniciando ===\n')

  // ── Estado actual ────────────────────────────────────────────────────────────
  const { data: jornadaVieja } = await supabase
    .from('jornadas').select('*').eq('semana_id', ID_SEMANA_VIEJA).order('fecha')
  const { data: jornadaNueva } = await supabase
    .from('jornadas').select('*').eq('semana_id', ID_SEMANA_NUEVA).order('fecha')

  console.log('📋 Jornadas actuales en semana VIEJA:', jornadaVieja?.map(j => j.fecha).join(', '))
  console.log('📋 Jornadas actuales en semana NUEVA:', jornadaNueva?.map(j => j.fecha).join(', '))

  // ── 1. Mover día 14 de la semana NUEVA de vuelta a la VIEJA ─────────────────
  console.log('\n🔁 Paso 1: mover jornada 2026-05-14 → semana vieja...')
  const jornada14 = jornadaNueva?.find(j => j.fecha === '2026-05-14')
  if (!jornada14) {
    console.log('   ⚠️  La jornada 2026-05-14 no está en la semana nueva, verificando si ya está en la vieja...')
    const en_vieja = jornadaVieja?.find(j => j.fecha === '2026-05-14')
    if (en_vieja) console.log('   ✅ Ya está en la semana vieja, ok.')
    else console.error('   ❌ No se encontró la jornada 2026-05-14 en ningún lado!')
  } else {
    const { error } = await supabase
      .from('jornadas').update({ semana_id: ID_SEMANA_VIEJA }).eq('id', jornada14.id)
    if (error) console.error('   ❌ Error:', error.message)
    else console.log('   ✅ Jornada 2026-05-14 movida a la semana vieja.')
  }

  // ── 2. Mover día 15 de la semana VIEJA a la NUEVA ───────────────────────────
  console.log('\n🔁 Paso 2: mover jornada 2026-05-15 → semana nueva...')
  const jornada15 = jornadaVieja?.find(j => j.fecha === '2026-05-15')
  if (!jornada15) {
    console.log('   ⚠️  La jornada 2026-05-15 no está en la semana vieja, verificando...')
    const en_nueva = jornadaNueva?.find(j => j.fecha === '2026-05-15')
    if (en_nueva) console.log('   ✅ Ya está en la semana nueva, ok.')
    else console.error('   ❌ No se encontró la jornada 2026-05-15 en ningún lado!')
  } else {
    const { error } = await supabase
      .from('jornadas').update({ semana_id: ID_SEMANA_NUEVA }).eq('id', jornada15.id)
    if (error) console.error('   ❌ Error:', error.message)
    else console.log('   ✅ Jornada 2026-05-15 movida a la semana nueva.')
  }

  // ── 3. Actualizar fecha_inicio de la semana nueva a 2026-05-15 ───────────────
  console.log('\n📆 Paso 3: actualizando fecha_inicio de la semana nueva a 2026-05-15...')
  const { error: errFecha } = await supabase
    .from('semanas')
    .update({ fecha_inicio: '2026-05-15' })
    .eq('id', ID_SEMANA_NUEVA)
  if (errFecha) console.error('   ❌ Error:', errFecha.message)
  else console.log('   ✅ fecha_inicio actualizada a 2026-05-15.')

  // ── Resumen final ─────────────────────────────────────────────────────────────
  const { data: viejaFinal } = await supabase
    .from('jornadas').select('fecha, estado').eq('semana_id', ID_SEMANA_VIEJA).order('fecha')
  const { data: nuevaFinal } = await supabase
    .from('jornadas').select('fecha, estado').eq('semana_id', ID_SEMANA_NUEVA).order('fecha')
  const { data: semanaViejaRow } = await supabase.from('semanas').select('*').eq('id', ID_SEMANA_VIEJA).single()
  const { data: semanaNuevaRow } = await supabase.from('semanas').select('*').eq('id', ID_SEMANA_NUEVA).single()

  console.log('\n─────────────────────────────────────────────')
  console.log(`📊 Semana VIEJA [${semanaViejaRow?.estado}]: ${semanaViejaRow?.fecha_inicio} → ${semanaViejaRow?.fecha_fin}`)
  viejaFinal?.forEach(j => console.log(`   ${j.fecha} [${j.estado}]`))

  console.log(`\n📊 Semana NUEVA [${semanaNuevaRow?.estado}]: ${semanaNuevaRow?.fecha_inicio} → ${semanaNuevaRow?.fecha_fin}`)
  nuevaFinal?.forEach(j => console.log(`   ${j.fecha} [${j.estado}]`))

  console.log('\n🎉 ¡Corrección aplicada!')
}

main().catch((err) => { console.error('Error:', err); process.exit(1) })
