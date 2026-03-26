import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { Card, CardContent, CardTitle, Badge } from '@/components/ui'
import { calcularResumenSemana } from '@/lib/queries'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function HistorialSemanaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Buscar la semana
  const { data: semana } = await supabase
    .from('semanas')
    .select('*')
    .eq('id', id)
    .single()

  if (!semana) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <p className="text-gray-500">Semana no encontrada.</p>
        <Link
          href="/historial"
          className="text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          &larr; Volver al historial
        </Link>
      </div>
    )
  }

  const resumen = await calcularResumenSemana(
    supabase,
    semana.id,
    semana.saldo_inicial,
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Detalle semanal</h1>
          <p className="text-sm text-gray-500">
            {formatDateShort(semana.fecha_inicio)} al{' '}
            {formatDateShort(semana.fecha_fin)}
          </p>
        </div>
        <Link
          href="/historial"
          className="text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          &larr; Volver
        </Link>
      </div>

      {/* Saldo card */}
      <div className="rounded-xl bg-gray-900 p-4 text-white">
        <h3 className="mb-1 text-sm text-gray-400">Saldo final</h3>
        <p
          className={`text-2xl font-bold ${resumen.saldoActual >= 0 ? 'text-green-400' : 'text-red-400'}`}
        >
          {formatCurrency(resumen.saldoActual)}
        </p>
        {semana.saldo_inicial > 0 && (
          <p className="mt-1 text-xs text-gray-400">
            Saldo inicial: {formatCurrency(semana.saldo_inicial)}
          </p>
        )}
      </div>

      {/* Tabla de jornadas */}
      <Card>
        <CardTitle>Jornadas</CardTitle>
        <CardContent className="mt-2">
          {resumen.jornadas.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">
              No hubo jornadas en esta semana.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {resumen.jornadas.map((j) => (
                <div
                  key={j.fecha}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium capitalize text-gray-800">
                      {j.dia}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDateShort(j.fecha)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(j.saldoDia)}
                    </span>
                    <span className="text-xs text-gray-500">
                      Venta: {formatCurrency(j.ventaTotal)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Totales */}
              <div className="mt-1 border-t pt-2">
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total ventas</span>
                    <span className="font-medium">
                      {formatCurrency(resumen.totales.ventaTotal)}
                    </span>
                  </div>
                  {resumen.totales.totalGastos > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Total gastos</span>
                      <span>
                        -{formatCurrency(resumen.totales.totalGastos)}
                      </span>
                    </div>
                  )}
                  {resumen.totales.totalTransferencias > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Total transferencias</span>
                      <span>
                        -{formatCurrency(resumen.totales.totalTransferencias)}
                      </span>
                    </div>
                  )}
                  {resumen.totales.totalDescuentos > 0 && (
                    <div className="flex justify-between text-yellow-600">
                      <span>Total descuentos</span>
                      <span>
                        -{formatCurrency(resumen.totales.totalDescuentos)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total alcancia</span>
                    <span className="font-medium text-blue-600">
                      {formatCurrency(resumen.totales.alcancia)}
                    </span>
                  </div>
                  {resumen.totales.totalPagas > 0 && (
                    <div className="flex justify-between text-purple-600">
                      <span>Total pagas</span>
                      <span>-{formatCurrency(resumen.totales.totalPagas)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1 font-medium">
                    <span>Saldo acumulado dias</span>
                    <span className="text-orange-600">
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
          <CardContent className="mt-2">
            <div className="flex flex-col gap-2">
              {resumen.inversiones.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-800">
                      {inv.descripcion}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {formatDateShort(inv.fecha)}
                      </span>
                      <Badge
                        variant={
                          inv.tipo === 'inversion' ? 'default' : 'warning'
                        }
                      >
                        {inv.tipo === 'inversion'
                          ? 'Inversion'
                          : 'Gasto personal'}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-sm font-medium">
                    {formatCurrency(inv.monto)}
                  </span>
                </div>
              ))}

              <div className="mt-1 flex flex-col gap-1 border-t pt-2 text-sm">
                {resumen.totalInversiones > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total inversiones</span>
                    <span className="font-medium">
                      {formatCurrency(resumen.totalInversiones)}
                    </span>
                  </div>
                )}
                {resumen.totalGastosPersonales > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Total gastos personales
                    </span>
                    <span className="font-medium">
                      {formatCurrency(resumen.totalGastosPersonales)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saldo final */}
      <div className="rounded-xl bg-orange-50 p-4">
        <h3 className="mb-3 font-semibold text-gray-900">Saldo semanal</h3>
        <div className="flex flex-col gap-1 text-sm">
          {semana.saldo_inicial > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Saldo inicial (anterior)</span>
              <span className="font-medium">
                {formatCurrency(semana.saldo_inicial)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Total saldos diarios</span>
            <span className="font-medium">
              {formatCurrency(resumen.totales.saldoDia)}
            </span>
          </div>
          {resumen.totalInversiones > 0 && (
            <div className="flex justify-between text-blue-600">
              <span>(-) Inversiones</span>
              <span>-{formatCurrency(resumen.totalInversiones)}</span>
            </div>
          )}
          {resumen.totalGastosPersonales > 0 && (
            <div className="flex justify-between text-purple-600">
              <span>(-) Gastos personales</span>
              <span>-{formatCurrency(resumen.totalGastosPersonales)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-orange-200 pt-2 text-base font-bold">
            <span>Saldo final</span>
            <span
              className={
                resumen.saldoActual >= 0 ? 'text-green-600' : 'text-red-600'
              }
            >
              {formatCurrency(resumen.saldoActual)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
