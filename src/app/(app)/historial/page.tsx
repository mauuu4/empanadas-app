import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { Card, CardContent, CardTitle, Badge } from '@/components/ui'
import { MesFilter } from '@/components/historial/MesFilter'
import { calcularResumenSemana } from '@/lib/queries'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function HistorialPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Buscar todas las semanas, ordenadas por fecha
  const { data: semanas } = await supabase
    .from('semanas')
    .select('*')
    .order('fecha_inicio', { ascending: false })

  if (!semanas || semanas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <p className="text-gray-500">No hay semanas registradas.</p>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          &larr; Volver al inicio
        </Link>
      </div>
    )
  }

  // Calcular resumen rapido de cada semana
  type SemanaCard = {
    id: string
    fechaInicio: string
    fechaFin: string
    estado: string
    ventaTotal: number
    saldoFinal: number
  }

  const semanasCards: SemanaCard[] = []

  for (const s of semanas) {
    const resumen = await calcularResumenSemana(supabase, s.id, s.saldo_inicial)
    semanasCards.push({
      id: s.id,
      fechaInicio: s.fecha_inicio,
      fechaFin: s.fecha_fin,
      estado: s.estado,
      ventaTotal: resumen.totales.ventaTotal,
      saldoFinal: resumen.saldoActual,
    })
  }

  // Calcular años disponibles para el filtro de mes
  const years = [
    ...new Set(
      semanas.map((s) => new Date(s.fecha_inicio + 'T00:00:00').getFullYear()),
    ),
  ].sort((a, b) => b - a)

  const now = new Date()

  // Estadisticas basicas (de la semana mas reciente cerrada vs la anterior)
  const cerradas = semanasCards.filter((s) => s.estado === 'cerrada')
  const ultimaCerrada = cerradas[0]
  const penultimaCerrada = cerradas[1]

  let tendencia: 'sube' | 'baja' | 'igual' | null = null
  if (ultimaCerrada && penultimaCerrada) {
    if (ultimaCerrada.ventaTotal > penultimaCerrada.ventaTotal) {
      tendencia = 'sube'
    } else if (ultimaCerrada.ventaTotal < penultimaCerrada.ventaTotal) {
      tendencia = 'baja'
    } else {
      tendencia = 'igual'
    }
  }

  // Promedio de venta diaria (de todas las semanas)
  let totalVentaGlobal = 0
  let totalDias = 0
  for (const s of semanas) {
    const { data: jornadas } = await supabase
      .from('jornadas')
      .select('id')
      .eq('semana_id', s.id)
    totalDias += (jornadas ?? []).length
  }
  totalVentaGlobal = semanasCards.reduce((sum, s) => sum + s.ventaTotal, 0)
  const promedioVentaDiaria = totalDias > 0 ? totalVentaGlobal / totalDias : 0

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-gray-900">Historial</h1>

      {/* Estadisticas rapidas */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-gray-900 p-3 text-white">
          <p className="text-xs text-gray-400">Promedio diario</p>
          <p className="text-lg font-bold text-green-400">
            {formatCurrency(promedioVentaDiaria)}
          </p>
          <p className="text-xs text-gray-400">{totalDias} jornadas</p>
        </div>
        <div className="rounded-xl bg-gray-900 p-3 text-white">
          <p className="text-xs text-gray-400">Tendencia</p>
          {tendencia === 'sube' && (
            <p className="text-lg font-bold text-green-400">Subiendo</p>
          )}
          {tendencia === 'baja' && (
            <p className="text-lg font-bold text-red-400">Bajando</p>
          )}
          {tendencia === 'igual' && (
            <p className="text-lg font-bold text-yellow-400">Estable</p>
          )}
          {!tendencia && <p className="text-lg font-bold text-gray-400">--</p>}
          <p className="text-xs text-gray-400">vs semana anterior</p>
        </div>
      </div>

      {/* Filtro por mes */}
      <Card>
        <CardTitle>Resumen mensual</CardTitle>
        <CardContent className="mt-2">
          <MesFilter
            currentYear={now.getFullYear()}
            currentMonth={now.getMonth() + 1}
            availableYears={years}
          />
        </CardContent>
      </Card>

      {/* Lista de semanas */}
      <Card>
        <CardTitle>Semanas</CardTitle>
        <CardContent className="mt-2">
          <div className="flex flex-col gap-2">
            {semanasCards.map((s) => (
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
                    Venta: {formatCurrency(s.ventaTotal)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${s.saldoFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {formatCurrency(s.saldoFinal)}
                  </span>
                  <Badge
                    variant={s.estado === 'cerrada' ? 'default' : 'success'}
                  >
                    {s.estado === 'cerrada' ? 'Cerrada' : 'Abierta'}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
