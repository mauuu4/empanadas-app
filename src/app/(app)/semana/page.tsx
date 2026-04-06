import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { Card, CardContent, CardTitle, Badge } from '@/components/ui'
import { CerrarSemanaForm } from '@/components/semana/CerrarSemanaForm'
import { calcularResumenSemana } from '@/lib/queries'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

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

  const { data: semana } = await supabase
    .from('semanas')
    .select('*')
    .order('fecha_inicio', { ascending: false })
    .limit(1)
    .single()

  if (!semana) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
          <svg className="h-7 w-7 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="font-medium text-gray-500">No hay semanas registradas.</p>
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
          Volver al inicio
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
    <div className="flex flex-col gap-5 stagger-children">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Semana actual</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {formatDateShort(semana.fecha_inicio)} al{' '}
            {formatDateShort(semana.fecha_fin)}
          </p>
        </div>
        <Badge variant={isCerrada ? 'default' : 'success'}>
          {isCerrada ? 'Cerrada' : 'Abierta'}
        </Badge>
      </div>

      {/* Saldo acumulado card */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-elevated">
        <p className="text-xs font-medium text-gray-400">Saldo acumulado</p>
        <p
          className={`mt-1 text-3xl font-bold tracking-tight ${resumen.saldoActual >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
        >
          {formatCurrency(resumen.saldoActual)}
        </p>
        {semana.saldo_inicial > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            Saldo inicial: {formatCurrency(semana.saldo_inicial)}
          </p>
        )}
      </div>

      {/* Tabla de jornadas */}
      <Card>
        <CardTitle>Jornadas</CardTitle>
        <CardContent className="mt-3">
          {resumen.jornadas.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-gray-400">
                No hay jornadas en esta semana.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {resumen.jornadas.map((j) => (
                <div
                  key={j.fecha}
                  className="flex items-center justify-between rounded-xl bg-gray-50/80 px-3.5 py-3"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold capitalize text-gray-800">
                      {j.dia}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {formatDateShort(j.fecha)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(j.saldoDia)}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Venta: {formatCurrency(j.ventaTotal)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Totales */}
              <div className="mt-2 rounded-xl bg-gray-50/80 p-3.5">
                <div className="flex flex-col gap-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total ventas</span>
                    <span className="font-semibold">
                      {formatCurrency(resumen.totales.ventaTotal)}
                    </span>
                  </div>
                  {resumen.totales.totalGastos > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Total gastos</span>
                      <span className="font-medium">
                        -{formatCurrency(resumen.totales.totalGastos)}
                      </span>
                    </div>
                  )}
                  {resumen.totales.totalTransferencias > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Total transferencias</span>
                      <span className="font-medium">
                        -{formatCurrency(resumen.totales.totalTransferencias)}
                      </span>
                    </div>
                  )}
                  {resumen.totales.totalDescuentos > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>Total descuentos</span>
                      <span className="font-medium">
                        -{formatCurrency(resumen.totales.totalDescuentos)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total alcancia</span>
                    <span className="font-semibold text-blue-600">
                      {formatCurrency(resumen.totales.alcancia)}
                    </span>
                  </div>
                  {resumen.totales.totalPagas > 0 && (
                    <div className="flex justify-between text-violet-600">
                      <span>Total pagas</span>
                      <span className="font-medium">-{formatCurrency(resumen.totales.totalPagas)}</span>
                    </div>
                  )}
                  <div className="mt-1 flex justify-between border-t border-gray-200/60 pt-2 font-bold">
                    <span className="text-gray-900">Saldo acumulado dias</span>
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
              className="flex items-center gap-1 text-sm font-semibold text-orange-600 transition-colors hover:text-orange-700"
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
            <div className="py-6 text-center">
              <p className="text-sm text-gray-400">
                No hay inversiones ni gastos registrados.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {resumen.inversiones.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-xl bg-gray-50/80 px-3.5 py-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-gray-800">
                      {inv.descripcion}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400">
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
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(inv.monto)}
                  </span>
                </div>
              ))}

              <div className="mt-1 rounded-xl bg-gray-50/80 p-3.5">
                <div className="flex flex-col gap-1.5 text-sm">
                  {resumen.totalInversiones > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total inversiones</span>
                      <span className="font-semibold">
                        {formatCurrency(resumen.totalInversiones)}
                      </span>
                    </div>
                  )}
                  {resumen.totalGastosPersonales > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Total gastos personales
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(resumen.totalGastosPersonales)}
                      </span>
                    </div>
                  )}
                </div>
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
