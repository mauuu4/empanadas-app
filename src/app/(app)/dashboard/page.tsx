import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDateWithTime, formatDateShort, today } from '@/lib/utils'
import { Card, CardContent, CardTitle } from '@/components/ui'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const vendedorId = user.user_metadata.vendedor_id as string

  const { data: vendedor } = await supabase
    .from('vendedores')
    .select('*')
    .eq('id', vendedorId)
    .single()

  if (!vendedor) redirect('/login')

  const isAdmin = vendedor.rol === 'admin'
  const fechaHoy = today()

  // Buscar jornada del dia
  const { data: jornada } = await supabase
    .from('jornadas')
    .select('*')
    .eq('fecha', fechaHoy)
    .single()

  // Buscar semana actual (abierta)
  const { data: semana } = await supabase
    .from('semanas')
    .select('*')
    .eq('estado', 'abierta')
    .order('fecha_inicio', { ascending: false })
    .limit(1)
    .single()

  return (
    <div className="flex flex-col gap-4">
      {/* Saludo */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Hola, {vendedor.nombre.split(' ')[0]}
        </h1>
        <p className="text-sm capitalize text-gray-500">
          {formatDateWithTime(new Date())}
        </p>
      </div>

      {/* Estado de la jornada */}
      <Card>
        <CardTitle>Jornada de hoy</CardTitle>
        <CardContent className="mt-2">
          {jornada && jornada.estado === 'abierta'? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Estado</span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    jornada.estado === 'abierta'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {jornada.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/jornada/asignar"
                  className="rounded-lg bg-orange-50 p-3 text-center text-sm font-medium text-orange-700 transition-colors hover:bg-orange-100"
                >
                  Asignar productos
                </Link>
                <Link
                  href="/jornada/movimientos"
                  className="rounded-lg bg-blue-50 p-3 text-center text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
                >
                  Movimientos
                </Link>
                <Link
                  href="/jornada/cerrar"
                  className="rounded-lg bg-purple-50 p-3 text-center text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100"
                >
                  Cerrar venta
                </Link>
                <Link
                  href="/jornada/resumen"
                  className="rounded-lg bg-green-50 p-3 text-center text-sm font-medium text-green-700 transition-colors hover:bg-green-100"
                >
                  Resumen
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm text-gray-500">
                No hay jornada creada para hoy.
              </p>
              {isAdmin && (
                <Link
                  href="/jornada"
                  className="mt-2 inline-block rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
                >
                  Crear jornada
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saldo semanal */}
      {semana && (
        <Card>
          <CardTitle>Semana actual</CardTitle>
          <CardContent className="mt-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Periodo</span>
                <span className="text-sm font-medium">
                  {formatDateShort(semana.fecha_inicio)} al{' '}
                  {formatDateShort(semana.fecha_fin)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Saldo inicial</span>
                <span className="text-sm font-medium">
                  {formatCurrency(semana.saldo_inicial)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/semana"
                  className="rounded-lg bg-gray-50 p-3 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  Ver detalle
                </Link>
                {isAdmin && (
                  <Link
                    href="/semana/inversiones"
                    className="rounded-lg bg-blue-50 p-3 text-center text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    Inversiones
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accesos admin */}
      {isAdmin && (
        <Card>
          <CardTitle>Administracion</CardTitle>
          <CardContent className="mt-2">
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/admin/productos"
                className="rounded-lg bg-amber-50 p-3 text-center text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
              >
                Productos
              </Link>
              <Link
                href="/admin/vendedores"
                className="rounded-lg bg-teal-50 p-3 text-center text-sm font-medium text-teal-700 transition-colors hover:bg-teal-100"
              >
                Vendedores
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
