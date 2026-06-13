import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { CerrarSemanaForm } from '@/components/semana/CerrarSemanaForm'
import { calcularResumenSemana } from '@/lib/queries'
import { getVendedor } from '@/lib/auth'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SemanaPage() {
  const supabase = await createClient()

  const [vendedor, { data: semana }] = await Promise.all([
    getVendedor(),
    supabase
      .from('semanas')
      .select('*')
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .single(),
  ])

  if (!vendedor) redirect('/login')

  const isAdmin = vendedor.rol === 'admin'

  if (!semana) {
    return (
      <EmptyState
        title="No hay semanas registradas."
        action={{ href: '/dashboard', label: 'Volver al inicio' }}
        className="py-16"
      />
    )
  }

  const isCerrada = semana.estado === 'cerrada'

  const resumen = await calcularResumenSemana(supabase, semana.id, semana.saldo_inicial)

  return (
    <div className="flex flex-col gap-5 stagger-children">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[1.7rem] font-semibold leading-tight tracking-tight text-warm-900">Semana actual</h1>
          <p className="mt-0.5 text-sm text-warm-400">
            {formatDateShort(semana.fecha_inicio)} al {formatDateShort(semana.fecha_fin)}
          </p>
        </div>
        <Badge variant={isCerrada ? 'default' : 'success'}>
          {isCerrada ? 'Cerrada' : 'En curso'}
        </Badge>
      </div>

      {/* Saldo acumulado */}
      <div className="rounded-2xl bg-gradient-dark p-5 shadow-elevated">
        <p className="text-xs font-medium text-warm-400">Saldo acumulado</p>
        <p className={`mt-1 font-display text-3xl font-bold tracking-tight ${resumen.saldoActual >= 0 ? 'text-white' : 'text-red-300'}`}>
          {formatCurrency(resumen.saldoActual)}
        </p>
        {semana.saldo_inicial > 0 && (
          <p className="mt-2 text-xs text-warm-500">
            Inicio de semana: {formatCurrency(semana.saldo_inicial)}
          </p>
        )}
      </div>

      {/* Jornadas de la semana */}
      <Card>
        <CardTitle>Jornadas</CardTitle>
        <CardContent className="mt-3">
          {resumen.jornadas.length === 0 ? (
            <p className="py-6 text-center text-sm text-warm-400">
              No hay jornadas registradas esta semana.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {resumen.jornadas.map((j) => {
                const inner = (
                  <>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold capitalize text-warm-800">
                        {j.dia}
                      </span>
                      <span className="text-[11px] text-warm-400">
                        {formatDateShort(j.fecha)}
                      </span>
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

              {/* Totales de jornadas */}
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
                      <span>Gastos</span>
                      <span className="font-medium">-{formatCurrency(resumen.totales.totalGastos)}</span>
                    </div>
                  )}
                  {resumen.totales.totalTransferencias > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Transferencias</span>
                      <span className="font-medium">-{formatCurrency(resumen.totales.totalTransferencias)}</span>
                    </div>
                  )}
                  {resumen.totales.totalDescuentos > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>Descuentos</span>
                      <span className="font-medium">-{formatCurrency(resumen.totales.totalDescuentos)}</span>
                    </div>
                  )}
                  {resumen.totales.alcancia > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Alcancia</span>
                      <span className="font-semibold">{formatCurrency(resumen.totales.alcancia)}</span>
                    </div>
                  )}
                  {resumen.totales.totalPagas > 0 && (
                    <div className="flex justify-between text-violet-600">
                      <span>Pagas</span>
                      <span className="font-medium">-{formatCurrency(resumen.totales.totalPagas)}</span>
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

      {/* Inversiones y gastos personales */}
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Inversiones y gastos</CardTitle>
          {isAdmin && !isCerrada && (
            <Link
              href="/semana/inversiones"
              className="flex items-center gap-1 text-sm font-semibold text-amber-600 transition-colors hover:text-amber-700"
            >
              Gestionar
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </Link>
          )}
        </div>
        <CardContent className="mt-3">
          {resumen.inversiones.length === 0 ? (
            <p className="py-4 text-center text-sm text-warm-400">
              No hay inversiones ni gastos registrados.
            </p>
          ) : (
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
                      <span className="font-semibold text-warm-900">{formatCurrency(resumen.totalInversiones)}</span>
                    </div>
                  )}
                  {resumen.totalGastosGenerales > 0 && (
                    <div className="flex justify-between">
                      <span className="text-warm-500">Total gastos generales</span>
                      <span className="font-semibold text-warm-900">{formatCurrency(resumen.totalGastosGenerales)}</span>
                    </div>
                  )}
                  {resumen.totalGastosPersonales > 0 && (
                    <div className="flex justify-between">
                      <span className="text-warm-500">Total gastos personales</span>
                      <span className="font-semibold text-warm-900">{formatCurrency(resumen.totalGastosPersonales)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cierre de semana (solo admin) */}
      {isAdmin && (
        <CerrarSemanaForm
          semanaId={semana.id}
          saldoInicial={semana.saldo_inicial}
          totalSaldosDiarios={resumen.totales.saldoDia}
          totalInversiones={resumen.totalInversiones}
          totalGastosGenerales={resumen.totalGastosGenerales}
          totalGastosPersonales={resumen.totalGastosPersonales}
          saldoActual={resumen.saldoActual}
          fechaFin={semana.fecha_fin}
          jornadas={resumen.jornadas.map((j) => ({ fecha: j.fecha }))}
          isAdmin={isAdmin}
          isCerrada={isCerrada}
        />
      )}
    </div>
  )
}
