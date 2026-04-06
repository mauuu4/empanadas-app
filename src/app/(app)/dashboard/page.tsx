import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDateWithTime, formatDateShort } from '@/lib/utils'
import { Card, CardContent, CardTitle } from '@/components/ui'
import { ensureJornadaHoy } from '@/lib/jornada-utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function ActionCard({
  href,
  icon,
  iconBg,
  title,
  subtitle,
}: {
  href: string
  icon: React.ReactNode
  iconBg: string
  title: string
  subtitle: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-card border border-gray-100/80 transition-all duration-150 hover:shadow-card-hover active:scale-[0.98]"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="truncate text-xs text-gray-400">{subtitle}</p>
      </div>
      <svg
        className="h-4 w-4 shrink-0 text-gray-300"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
          clipRule="evenodd"
        />
      </svg>
    </Link>
  )
}

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

  // Auto-create jornada if needed (only for admin)
  let jornada = null
  let semana = null

  if (isAdmin) {
    const result = await ensureJornadaHoy(supabase)
    jornada = result.jornada
    semana = result.semana
  } else {
    // Non-admin: just look for today's jornada
    const { data } = await supabase
      .from('jornadas')
      .select('*')
      .eq('fecha', new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' }))
      .single()
    jornada = data

    // Get semana
    const { data: semanaData } = await supabase
      .from('semanas')
      .select('*')
      .eq('estado', 'abierta')
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .single()
    semana = semanaData
  }

  return (
    <div className="flex flex-col gap-5 stagger-children">
      {/* Saludo */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Hola, {vendedor.nombre.split(' ')[0]}
        </h1>
        <p className="mt-0.5 text-sm capitalize text-gray-400">
          {formatDateWithTime(new Date())}
        </p>
      </div>

      {/* Estado de la jornada */}
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Jornada de hoy</CardTitle>
          {jornada && jornada.estado === 'abierta' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Abierta
            </span>
          )}
        </div>
        <CardContent className="mt-3">
          {jornada && jornada.estado === 'abierta' ? (
            <div className="grid grid-cols-2 gap-2">
              <ActionCard
                href="/jornada/asignar"
                icon={
                  <svg className="h-5 w-5 text-orange-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                  </svg>
                }
                iconBg="bg-orange-50"
                title="Asignar"
                subtitle="Productos"
              />
              <ActionCard
                href="/jornada/movimientos"
                icon={
                  <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M13.2 2.24a.75.75 0 00.04 1.06l2.1 1.95H6.75a.75.75 0 000 1.5h8.59l-2.1 1.95a.75.75 0 101.02 1.1l3.5-3.25a.75.75 0 000-1.1l-3.5-3.25a.75.75 0 00-1.06.04zm-6.4 8a.75.75 0 00-1.06-.04l-3.5 3.25a.75.75 0 000 1.1l3.5 3.25a.75.75 0 101.02-1.1l-2.1-1.95h8.59a.75.75 0 000-1.5H4.66l2.1-1.95a.75.75 0 00.04-1.06z" clipRule="evenodd" />
                  </svg>
                }
                iconBg="bg-blue-50"
                title="Movimientos"
                subtitle="Gastos y transferencias"
              />
              <ActionCard
                href="/jornada/cerrar"
                icon={
                  <svg className="h-5 w-5 text-violet-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                }
                iconBg="bg-violet-50"
                title="Cerrar venta"
                subtitle="Registrar sobrantes"
              />
              <ActionCard
                href="/jornada/resumen"
                icon={
                  <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M2 3.75A.75.75 0 012.75 3h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zm0 4.167a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.166a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.167a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                  </svg>
                }
                iconBg="bg-emerald-50"
                title="Resumen"
                subtitle="Vista del dia"
              />
            </div>
          ) : jornada && jornada.estado === 'cerrada' ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                <svg className="h-7 w-7 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-emerald-700">
                Jornada cerrada
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Manana se creara una nueva automaticamente.
              </p>
              <Link
                href="/jornada/resumen"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 active:scale-[0.98]"
              >
                Ver resumen
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="py-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                <svg className="h-7 w-7 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">
                No hay jornada creada para hoy.
              </p>
              <p className="mt-1 text-xs text-gray-400">
                El administrador debe iniciar sesion para crear la jornada.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saldo semanal */}
      {semana && (
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-elevated">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400">Semana actual</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {formatDateShort(semana.fecha_inicio)} - {formatDateShort(semana.fecha_fin)}
              </p>
            </div>
            {semana.saldo_inicial > 0 && (
              <span className="rounded-lg bg-white/10 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                Inicio: {formatCurrency(semana.saldo_inicial)}
              </span>
            )}
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-500">Saldo</p>
              <p className="text-2xl font-bold text-white tracking-tight">
                {formatCurrency(semana.saldo_inicial)}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/semana"
                className="rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-white/20 active:scale-95"
              >
                Ver detalle
              </Link>
              {isAdmin && (
                <Link
                  href="/semana/inversiones"
                  className="rounded-xl bg-orange-500/90 px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-orange-500 active:scale-95"
                >
                  Inversiones
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Accesos admin */}
      {isAdmin && (
        <Card>
          <CardTitle>Administracion</CardTitle>
          <CardContent className="mt-3 grid grid-cols-2 gap-2">
            <ActionCard
              href="/admin/productos"
              icon={
                <svg className="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 3.75A2.75 2.75 0 018.75 1h2.5A2.75 2.75 0 0114 3.75v.443c.572.055 1.14.122 1.706.2C17.053 4.582 18 5.75 18 7.07v3.469c0 1.126-.694 2.191-1.83 2.54-1.952.599-4.024.921-6.17.921s-4.219-.322-6.17-.921C2.694 12.73 2 11.665 2 10.539V7.07c0-1.321.947-2.489 2.294-2.676A41.047 41.047 0 016 4.193V3.75zm6.5 0v.325a41.622 41.622 0 00-5 0V3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25zM10 10a1 1 0 00-1 1v.01a1 1 0 001 1h.01a1 1 0 001-1V11a1 1 0 00-1-1H10z" clipRule="evenodd" />
                  <path d="M3 15.055v-.684c.126.053.255.1.39.142 2.092.642 4.313.987 6.61.987 2.297 0 4.518-.345 6.61-.987.135-.041.264-.089.39-.142v.684c0 1.347-.985 2.53-2.363 2.686A41.454 41.454 0 0110 18c-1.572 0-3.118-.12-4.637-.359C3.985 17.585 3 16.402 3 15.055z" />
                </svg>
              }
              iconBg="bg-amber-50"
              title="Productos"
              subtitle="Gestionar catalogo"
            />
            <ActionCard
              href="/admin/vendedores"
              icon={
                <svg className="h-5 w-5 text-teal-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
                </svg>
              }
              iconBg="bg-teal-50"
              title="Vendedores"
              subtitle="Gestionar equipo"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
