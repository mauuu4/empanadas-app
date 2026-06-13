import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { calcularResumenSemana } from '@/lib/queries'
import { getVendedor } from '@/lib/auth'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function HistorialSemanaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [vendedor, { data: semana }] = await Promise.all([
    getVendedor(),
    supabase.from('semanas').select('*').eq('id', id).single(),
  ])

  if (!vendedor) redirect('/login')

  const isAdmin = vendedor.rol === 'admin'

  if (!semana) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Detalle semanal" backHref="/historial" backLabel="Historial" />
        <EmptyState
          title="Semana no encontrada."
          action={{ href: '/historial', label: 'Volver al historial' }}
          className="py-12"
        />
      </div>
    )
  }

  const resumen = await calcularResumenSemana(supabase, semana.id, semana.saldo_inicial)

  return (
    <div className="flex flex-col gap-5 stagger-children">
      <PageHeader
        title="Detalle semanal"
        subtitle={`${formatDateShort(semana.fecha_inicio)} al ${formatDateShort(semana.fecha_fin)}`}
        backHref="/historial"
        backLabel="Historial"
        badge={
          <Badge variant={semana.estado === 'cerrada' ? 'default' : 'success'}>
            {semana.estado === 'cerrada' ? 'Cerrada' : 'En curso'}
          </Badge>
        }
      />

      {/* Saldo acumulado */}
      <div className="rounded-2xl bg-gradient-dark p-5 shadow-elevated">
        <p className="text-xs font-medium text-warm-400">Saldo final</p>
        <p className={`mt-1 font-display text-3xl font-bold tracking-tight ${resumen.saldoActual >= 0 ? 'text-white' : 'text-red-300'}`}>
          {formatCurrency(resumen.saldoActual)}
        </p>
        {semana.saldo_inicial > 0 && (
          <p className="mt-2 text-xs text-warm-500">
            Saldo inicial: {formatCurrency(semana.saldo_inicial)}
          </p>
        )}
      </div>

      {/* Tabla de jornadas */}
      <Card>
        <CardTitle>Jornadas</CardTitle>
        <CardContent className="mt-3">
          {resumen.jornadas.length === 0 ? (
            <p className="py-6 text-center text-sm text-warm-400">
              No hubo jornadas en esta semana.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {resumen.jornadas.map((j) => {
                const inner = (
                  <>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold capitalize text-warm-800">{j.dia}</span>
                      <span className="text-[11px] text-warm-400">{formatDateShort(j.fecha)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-semibold ${j.saldoDia >= 0 ? 'text-warm-900' : 'text-red-600'}`}>
                          {formatCurrency(j.saldoDia)}
                        </span>
                        <span className="text-[11px] text-warm-400">
                          Venta: {formatCurrency(j.ventaTotal)}
                        </span>
                      </div>
                      {isAdmin && (
                        <svg className="h-4 w-4 shrink-0 text-warm-300" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </>
                )
                return isAdmin ? (
                  <Link
                    key={j.fecha}
                    href={`/admin/jornadas/${j.fecha}`}
                    className="flex items-center justify-between rounded-xl bg-warm-50/80 px-3.5 py-3 transition-all duration-150 hover:bg-warm-100/80 active:scale-[0.99]"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div
                    key={j.fecha}
                    className="flex items-center justify-between rounded-xl bg-warm-50/80 px-3.5 py-3"
                  >
                    {inner}
                  </div>
                )
              })}

              {/* Totales */}
              <div className="mt-1 rounded-xl bg-warm-50/80 p-3.5">
                <div className="flex flex-col gap-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-warm-500">Total ventas</span>
                    <span className="font-semibold text-warm-900">
                      {formatCurrency(resumen.totales.ventaTotal)}
                    </span>
                  </div>
                  {resumen.totales.totalGastos > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Total gastos</span>
                      <span>-{formatCurrency(resumen.totales.totalGastos)}</span>
                    </div>
                  )}
                  {resumen.totales.totalTransferencias > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Total transferencias</span>
                      <span>-{formatCurrency(resumen.totales.totalTransferencias)}</span>
                    </div>
                  )}
                  {resumen.totales.totalDescuentos > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>Total descuentos</span>
                      <span>-{formatCurrency(resumen.totales.totalDescuentos)}</span>
                    </div>
                  )}
                  {resumen.totales.alcancia > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Total alcancia</span>
                      <span className="font-semibold">{formatCurrency(resumen.totales.alcancia)}</span>
                    </div>
                  )}
                  {resumen.totales.totalPagas > 0 && (
                    <div className="flex justify-between text-violet-600">
                      <span>Total pagas</span>
                      <span>-{formatCurrency(resumen.totales.totalPagas)}</span>
                    </div>
                  )}
                  <div className="mt-1 flex justify-between border-t border-warm-200/60 pt-2 font-bold">
                    <span className="text-warm-900">Saldo de jornadas</span>
                    <span className={resumen.totales.saldoDia >= 0 ? 'text-orange-600' : 'text-red-600'}>
                      {formatCurrency(resumen.totales.saldoDia)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inversiones y gastos */}
      {resumen.inversiones.length > 0 && (
        <Card>
          <CardTitle>Inversiones y gastos</CardTitle>
          <CardContent className="mt-3">
            <div className="flex flex-col gap-2">
              {resumen.inversiones.map((inv) => (
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
                  {resumen.totalInversiones > 0 && (
                    <div className="flex justify-between">
                      <span className="text-warm-500">Total inversiones</span>
                      <span className="font-semibold text-warm-900">
                        {formatCurrency(resumen.totalInversiones)}
                      </span>
                    </div>
                  )}
                  {resumen.totalGastosGenerales > 0 && (
                    <div className="flex justify-between">
                      <span className="text-warm-500">Total gastos generales</span>
                      <span className="font-semibold text-warm-900">
                        {formatCurrency(resumen.totalGastosGenerales)}
                      </span>
                    </div>
                  )}
                  {resumen.totalGastosPersonales > 0 && (
                    <div className="flex justify-between">
                      <span className="text-warm-500">Total gastos personales</span>
                      <span className="font-semibold text-warm-900">
                        {formatCurrency(resumen.totalGastosPersonales)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saldo semanal */}
      <div className="rounded-2xl bg-gradient-to-br from-warm-900 to-warm-800 p-5 text-white shadow-elevated">
        <h3 className="mb-3 text-sm font-semibold text-warm-300">Saldo semanal</h3>
        <div className="flex flex-col gap-1.5 text-sm">
          {semana.saldo_inicial > 0 && (
            <div className="flex justify-between">
              <span className="text-warm-300">Saldo inicial (anterior)</span>
              <span className="font-medium">{formatCurrency(semana.saldo_inicial)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-warm-300">Total saldos diarios</span>
            <span className="font-medium">{formatCurrency(resumen.totales.saldoDia)}</span>
          </div>
          {resumen.totalInversiones > 0 && (
            <div className="flex justify-between text-blue-300">
              <span>(-) Inversiones</span>
              <span>-{formatCurrency(resumen.totalInversiones)}</span>
            </div>
          )}
          {resumen.totalGastosGenerales > 0 && (
            <div className="flex justify-between text-amber-300">
              <span>(-) Gastos generales</span>
              <span>-{formatCurrency(resumen.totalGastosGenerales)}</span>
            </div>
          )}
          {resumen.totalGastosPersonales > 0 && (
            <div className="flex justify-between text-violet-300">
              <span>(-) Gastos personales</span>
              <span>-{formatCurrency(resumen.totalGastosPersonales)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-warm-700/60 pt-2 text-base font-bold">
            <span>Saldo final</span>
            <span className={resumen.saldoActual >= 0 ? 'text-amber-400' : 'text-red-400'}>
              {formatCurrency(resumen.saldoActual)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
