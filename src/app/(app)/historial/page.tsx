import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { MesFilter } from '@/components/historial/MesFilter'
import { calcularResumenSemana } from '@/lib/queries'
import { getUser } from '@/lib/auth'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function HistorialPage() {
  const supabase = await createClient()

  const [user, { data: semanas }] = await Promise.all([
    getUser(),
    supabase
      .from('semanas')
      .select('*')
      .order('fecha_inicio', { ascending: false }),
  ])

  if (!user) redirect('/login')

  if (!semanas || semanas.length === 0) {
    return (
      <EmptyState
        title="No hay semanas registradas."
        action={{ href: '/dashboard', label: 'Volver al inicio' }}
        className="py-16"
      />
    )
  }

  type SemanaCard = {
    id: string
    fechaInicio: string
    fechaFin: string
    estado: string
    ventaTotal: number
    saldoFinal: number
  }

  const semanaIds = semanas.map((s) => s.id)
  const [resumenResults, { data: allJornadas }] = await Promise.all([
    Promise.all(
      semanas.map((s) => calcularResumenSemana(supabase, s.id, s.saldo_inicial)),
    ),
    supabase.from('jornadas').select('semana_id').in('semana_id', semanaIds),
  ])

  const semanasCards: SemanaCard[] = semanas.map((s, i) => ({
    id: s.id,
    fechaInicio: s.fecha_inicio,
    fechaFin: s.fecha_fin,
    estado: s.estado,
    ventaTotal: resumenResults[i].totales.ventaTotal,
    saldoFinal: resumenResults[i].saldoActual,
  }))

  const years = [
    ...new Set(
      semanas.map((s) => new Date(s.fecha_inicio + 'T00:00:00').getFullYear()),
    ),
  ].sort((a, b) => b - a)

  const now = new Date()

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

  const totalDias = (allJornadas ?? []).length
  const totalVentaGlobal = semanasCards.reduce((sum, s) => sum + s.ventaTotal, 0)
  const promedioVentaDiaria = totalDias > 0 ? totalVentaGlobal / totalDias : 0

  return (
    <div className="flex flex-col gap-5 stagger-children">
      <h1 className="font-display text-[1.7rem] font-semibold leading-tight tracking-tight text-warm-900">Historial</h1>

      {/* Estadisticas rapidas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gradient-dark p-4 shadow-elevated">
          <p className="text-[11px] font-medium text-warm-400">Promedio diario</p>
          <p className="mt-1 text-xl font-bold tracking-tight text-emerald-400">
            {formatCurrency(promedioVentaDiaria)}
          </p>
          <p className="mt-1.5 text-[11px] text-warm-500">{totalDias} jornadas</p>
        </div>
        <div className="rounded-2xl bg-gradient-dark p-4 shadow-elevated">
          <p className="text-[11px] font-medium text-warm-400">Tendencia</p>
          {tendencia === 'sube' && (
            <div className="mt-1 flex items-center gap-1.5">
              <svg className="h-5 w-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.577 4.878a.75.75 0 01.919-.53l4.78 1.281a.75.75 0 01.531.919l-1.281 4.78a.75.75 0 01-1.449-.387l.81-3.022a19.407 19.407 0 00-5.594 5.203.75.75 0 01-1.139.093L7 10.06l-4.72 4.72a.75.75 0 01-1.06-1.06l5.25-5.25a.75.75 0 011.06 0l3.074 3.073a20.923 20.923 0 015.545-4.93l-3.042.815a.75.75 0 01-.53-.919z" clipRule="evenodd" />
              </svg>
              <span className="text-xl font-bold text-emerald-400">Subiendo</span>
            </div>
          )}
          {tendencia === 'baja' && (
            <div className="mt-1 flex items-center gap-1.5">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M1.22 5.222a.75.75 0 011.06 0L7 9.942l3.768-3.769a.75.75 0 011.113.058 20.908 20.908 0 013.813 7.254l1.574-2.727a.75.75 0 011.3.75l-2.475 4.286a.75.75 0 01-1.025.275l-4.287-2.475a.75.75 0 01.75-1.3l2.71 1.565a19.422 19.422 0 00-3.013-6.024L7.53 11.533a.75.75 0 01-1.06 0l-5.25-5.25a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
              <span className="text-xl font-bold text-red-400">Bajando</span>
            </div>
          )}
          {tendencia === 'igual' && (
            <p className="mt-1 text-xl font-bold text-amber-400">Estable</p>
          )}
          {!tendencia && <p className="mt-1 text-xl font-bold text-warm-500">--</p>}
          <p className="mt-1.5 text-[11px] text-warm-500">vs semana anterior</p>
        </div>
      </div>

      {/* Filtro por mes */}
      <Card>
        <CardTitle>Resumen mensual</CardTitle>
        <CardContent className="mt-3">
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
        <CardContent className="mt-3">
          <div className="flex flex-col gap-2">
            {semanasCards.map((s) => (
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
                    Venta: {formatCurrency(s.ventaTotal)}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className={`text-sm font-bold ${s.saldoFinal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(s.saldoFinal)}
                  </span>
                  <Badge variant={s.estado === 'cerrada' ? 'default' : 'success'}>
                    {s.estado === 'cerrada' ? 'Cerrada' : 'En curso'}
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
