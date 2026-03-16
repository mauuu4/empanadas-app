import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { Card, CardContent, CardTitle, Badge } from '@/components/ui'
import { CerrarSemanaForm } from '@/components/semana/CerrarSemanaForm'
import { calcularResumenSemana } from '@/lib/queries'
import Link from 'next/link'

export default async function SemanaPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const vendedorId = user.user_metadata.vendedor_id as string

  const { data: vendedor } = await supabase
    .from('vendedores')
    .select('rol')
    .eq('id', vendedorId)
    .single()

  const isAdmin = vendedor?.rol === 'admin'

  // Buscar semana actual (abierta) o la mas reciente
  const { data: semana } = await supabase
    .from('semanas')
    .select('*')
    .order('fecha_inicio', { ascending: false })
    .limit(1)
    .single()

  if (!semana) {
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

  const isCerrada = semana.estado === 'cerrada'

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
          <h1 className="text-xl font-bold text-gray-900">Semana actual</h1>
          <p className="text-sm text-gray-500">
            {formatDateShort(semana.fecha_inicio)} al{' '}
            {formatDateShort(semana.fecha_fin)}
          </p>
        </div>
        <Badge variant={isCerrada ? 'default' : 'success'}>
          {isCerrada ? 'Cerrada' : 'Abierta'}
        </Badge>
      </div>

      {/* Saldo acumulado card */}
      <div className="rounded-xl bg-gray-900 p-4 text-white">
        <h3 className="mb-1 text-sm text-gray-400">Saldo acumulado</h3>
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
              No hay jornadas en esta semana.
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

      {/* Inversiones y gastos personales */}
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Inversiones y gastos</CardTitle>
          {isAdmin && !isCerrada && (
            <Link
              href="/semana/inversiones"
              className="text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              Gestionar
            </Link>
          )}
        </div>
        <CardContent className="mt-2">
          {resumen.inversiones.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">
              No hay inversiones ni gastos registrados.
            </p>
          ) : (
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
          )}
        </CardContent>
      </Card>

      {/* Cierre de semana (admin only) */}
      {isAdmin && (
        <CerrarSemanaForm
          semanaId={semana.id}
          saldoInicial={semana.saldo_inicial}
          totalSaldosDiarios={resumen.totales.saldoDia}
          totalInversiones={resumen.totalInversiones}
          totalGastosPersonales={resumen.totalGastosPersonales}
          saldoActual={resumen.saldoActual}
          isAdmin={isAdmin}
          isCerrada={isCerrada}
        />
      )}
    </div>
  )
}
