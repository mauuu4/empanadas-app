import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { today, formatDate } from '@/lib/utils'
import { Card, CardContent, CardTitle } from '@/components/ui'
import { CrearJornadaButton } from '@/components/jornada/CrearJornadaButton'
import Link from 'next/link'

export default async function JornadaPage() {
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

  // Buscar semana abierta
  const { data: semana } = await supabase
    .from('semanas')
    .select('*')
    .eq('estado', 'abierta')
    .order('fecha_inicio', { ascending: false })
    .limit(1)
    .single()

  // Si hay jornada, buscar asignaciones del vendedor
  let asignaciones: {
    id: string
    cantidad_inicial: number
    cantidad_sobrante: number | null
    producto_id: string
  }[] = []
  if (jornada) {
    const { data } = await supabase
      .from('asignaciones')
      .select('id, cantidad_inicial, cantidad_sobrante, producto_id')
      .eq('jornada_id', jornada.id)
      .eq('vendedor_id', vendedorId)

    asignaciones = data ?? []
  }

  const hasAsignaciones = asignaciones.length > 0
  const hasCerrado = asignaciones.every((a) => a.cantidad_sobrante !== null)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Jornada</h1>
        <p className="text-sm capitalize text-gray-500">
          {formatDate(fechaHoy)}
        </p>
      </div>

      {jornada && jornada.estado === 'cerrada' ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="mb-2 text-gray-500">La jornada de hoy esta cerrada.</p>
            <p className="mb-4 text-sm text-gray-400">
              {formatDate(jornada.fecha)}
            </p>
            {isAdmin ? (
              <CrearJornadaButton semanaId={semana?.id} />
            ) : (
              <p className="text-sm text-gray-500">
                Espera a que el administrador cree una nueva jornada.
              </p>
            )}
          </CardContent>
        </Card>
      ) : jornada ? (
        <>
          <Card>
            <CardTitle>Estado de la jornada</CardTitle>
            <CardContent className="mt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Estado</span>
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                  Abierta
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Link
              href="/jornada/asignar"
              className="rounded-xl bg-white p-4 shadow-sm transition-colors hover:bg-orange-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">
                    Asignar productos
                  </h3>
                  <p className="text-sm text-gray-500">
                    {hasAsignaciones
                      ? `${asignaciones.length} productos asignados`
                      : 'Registra los productos que llevas'}
                  </p>
                </div>
                <span className="text-gray-400">&rarr;</span>
              </div>
            </Link>

            <Link
              href="/jornada/movimientos"
              className="rounded-xl bg-white p-4 shadow-sm transition-colors hover:bg-blue-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Movimientos</h3>
                  <p className="text-sm text-gray-500">
                    Gastos, transferencias y descuentos
                  </p>
                </div>
                <span className="text-gray-400">&rarr;</span>
              </div>
            </Link>

            <Link
              href="/jornada/cerrar"
              className="rounded-xl bg-white p-4 shadow-sm transition-colors hover:bg-purple-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Cerrar venta</h3>
                  <p className="text-sm text-gray-500">
                    {hasCerrado && hasAsignaciones
                      ? 'Venta cerrada - ver resumen'
                      : 'Registra sobrantes y cierra tu venta'}
                  </p>
                </div>
                <span className="text-gray-400">&rarr;</span>
              </div>
            </Link>

            {isAdmin && (
              <Link
                href="/jornada/resumen"
                className="rounded-xl bg-white p-4 shadow-sm transition-colors hover:bg-green-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Resumen del dia
                    </h3>
                    <p className="text-sm text-gray-500">
                      Consolidado de todos los vendedores
                    </p>
                  </div>
                  <span className="text-gray-400">&rarr;</span>
                </div>
              </Link>
            )}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="mb-4 text-gray-500">
              No hay jornada creada para hoy.
            </p>
            {isAdmin ? (
              <CrearJornadaButton semanaId={semana?.id} />
            ) : (
              <p className="text-sm text-gray-500">
                Espera a que el administrador cree la jornada.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
