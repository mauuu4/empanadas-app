import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDateWithTime, formatDateShort } from '@/lib/utils'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { ActionCard } from '@/components/ui/ActionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonBlock } from '@/components/ui/Skeleton'
import { ensureJornadaHoy } from '@/lib/jornada-utils'
import { calcularResumenSemana } from '@/lib/queries'
import { getUser, getVendedor } from '@/lib/auth'
import type { Semana } from '@/types'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [user, vendedor] = await Promise.all([getUser(), getVendedor()])

  if (!user || !vendedor) redirect('/login')

  const isAdmin = vendedor.rol === 'admin'

  const adminClient = await createAdminClient()
  const result = await ensureJornadaHoy(adminClient)
  const jornada = result.jornada
  const semana = result.semana

  // Progreso del dia (solo vendedores): asignar -> cerrar venta.
  // El saldo semanal (más pesado) se carga en streaming, ver <SaldoSemanal />.
  const { data: asigsVendedor } =
    !isAdmin && jornada
      ? await adminClient
          .from('asignaciones')
          .select('cantidad_sobrante')
          .eq('jornada_id', jornada.id)
          .eq('vendedor_id', vendedor.id)
      : { data: [] as { cantidad_sobrante: number | null }[] }

  const hasAsignaciones = (asigsVendedor?.length ?? 0) > 0
  const hasCerradoVenta =
    hasAsignaciones && (asigsVendedor ?? []).every((a) => a.cantidad_sobrante !== null)

  return (
    <div className="flex flex-col gap-5 stagger-children">
      <div>
        <h1 className="font-display text-[1.9rem] font-semibold leading-tight tracking-tight text-warm-900">
          Hola, <span className="italic text-amber-700">{vendedor.nombre.split(' ')[0]}</span>
        </h1>
        <p className="mt-1 text-sm capitalize text-warm-400">
          {formatDateWithTime(new Date())}
        </p>
      </div>

      {/* Estado de la jornada */}
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Jornada de hoy</CardTitle>
          {jornada?.estado === 'abierta' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              En curso
            </span>
          )}
        </div>
        <CardContent className="mt-3">
          {jornada?.estado === 'abierta' ? (
            <>
            {!isAdmin && (
              <div className="mb-3 flex items-center gap-2 rounded-2xl bg-warm-50 px-4 py-3 ring-1 ring-inset ring-warm-200/60">
                <ProgressDot done={hasAsignaciones} label="Asignar" />
                <ProgressLine />
                <ProgressDot done={false} label="Movimientos" optional />
                <ProgressLine />
                <ProgressDot done={hasCerradoVenta} label="Cerrar venta" />
              </div>
            )}
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
            </>
          ) : jornada?.estado === 'cerrada' ? (
            <EmptyState
              icon={
                <svg className="h-7 w-7 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
              }
              iconBg="bg-emerald-50"
              title="Jornada completada"
              description="El dia de hoy ya esta cerrado."
              action={{ href: '/jornada/resumen', label: 'Ver resumen del dia', direction: 'forward' }}
              className="py-5"
            />
          ) : (
            <EmptyState
              title="Sin jornada activa"
              description="El administrador debe ingresar para iniciar la jornada."
              className="py-5"
            />
          )}
        </CardContent>
      </Card>

      {/* Saldo semanal — se calcula en streaming para no bloquear el render del resto */}
      {semana && (
        <Suspense fallback={<SkeletonBlock className="h-[120px] w-full rounded-2xl" />}>
          <SaldoSemanal semana={semana} isAdmin={isAdmin} />
        </Suspense>
      )}

      {/* Accesos rápidos de administración */}
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

// Subcomponente async: calcula el saldo de la semana y se renderiza en streaming
// (envuelto en <Suspense> en el dashboard) para no bloquear el resto de la página.
async function SaldoSemanal({
  semana,
  isAdmin,
}: {
  semana: Semana
  isAdmin: boolean
}) {
  const adminClient = await createAdminClient()
  const resumen = await calcularResumenSemana(
    adminClient,
    semana.id,
    semana.saldo_inicial,
  )

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-dark p-5 shadow-elevated">
      <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-warm-400">Semana actual</p>
            <p className="mt-0.5 text-xs text-warm-500">
              {formatDateShort(semana.fecha_inicio)} — {formatDateShort(semana.fecha_fin)}
            </p>
          </div>
          {semana.saldo_inicial > 0 && (
            <span className="rounded-lg bg-white/10 px-2 py-0.5 text-[10px] font-medium text-warm-400">
              Inicio: {formatCurrency(semana.saldo_inicial)}
            </span>
          )}
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-xs text-warm-500">Saldo acumulado</p>
            <p className={`font-display text-2xl font-bold tracking-tight ${resumen.saldoActual >= 0 ? 'text-white' : 'text-red-300'}`}>
              {formatCurrency(resumen.saldoActual)}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/semana"
              className="rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-white/20 active:scale-95"
            >
              Ver detalle
            </Link>
            {isAdmin && (
              <Link
                href="/semana/inversiones"
                className="rounded-xl bg-amber-600/90 px-3.5 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-amber-600 active:scale-95"
              >
                Inversiones
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProgressDot({
  done,
  label,
  optional = false,
}: {
  done: boolean
  label: string
  optional?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
          done ? 'border-emerald-500 bg-emerald-500' : 'border-warm-300 bg-white'
        }`}
      >
        {done && (
          <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      <span
        className={`text-[10px] font-medium leading-none ${
          done ? 'text-emerald-600' : optional ? 'text-warm-400' : 'text-warm-500'
        }`}
      >
        {label}
        {optional && (
          <span className="block text-center text-[9px] text-warm-300">opcional</span>
        )}
      </span>
    </div>
  )
}

function ProgressLine() {
  return <div className="mb-4 h-px flex-1 bg-warm-200" />
}
