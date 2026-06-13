import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import type { VendedorResumenDia, ProductoResumenDia } from '@/lib/queries'

interface Totales {
  ventaBruta: number
  gastos: number
  transferencias: number
  descuentos: number
  efectivo: number
}

interface DiaResumenViewProps {
  porVendedor: VendedorResumenDia[]
  porProducto: ProductoResumenDia[]
  totales: Totales
  /**
   * Si se provee, cada tarjeta de vendedor es un enlace a
   * `${vendedorHrefPrefix}${vendedorId}` (hub por-vendedor del admin para
   * asignar / movimientos / cerrar). Si se omite, las tarjetas no son clicables.
   */
  vendedorHrefPrefix?: string
}

/**
 * Vista consolidada de una jornada (día): desglose por vendedor + total del día
 * + productos del día. Compartida por `/admin/jornadas/[fecha]` (admin, tarjetas
 * clicables) y `/jornada/resumen` (consolidado del día).
 */
export function DiaResumenView({
  porVendedor,
  porProducto,
  totales,
  vendedorHrefPrefix,
}: DiaResumenViewProps) {
  // Orden estable: pendientes de cierre primero, luego cerrados, luego sin asignaciones
  const vendedores = [...porVendedor].sort((a, b) => {
    const score = (v: VendedorResumenDia) =>
      !v.tieneAsignaciones ? 2 : v.pendienteDeCierre ? 0 : 1
    return score(a) - score(b)
  })

  const clickable = !!vendedorHrefPrefix

  return (
    <>
      {/* Vendedores */}
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Vendedores</CardTitle>
          {clickable && (
            <span className="text-[11px] font-medium text-warm-400">
              Toca para gestionar
            </span>
          )}
        </div>
        <CardContent className="mt-3">
          <div className="flex flex-col gap-2.5">
            {vendedores.map((v) => {
              const statusColor = !v.tieneAsignaciones
                ? 'bg-warm-300'
                : v.pendienteDeCierre
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'

              const body = (
                <>
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusColor}`} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-warm-800">
                      {v.nombre}
                    </span>
                    {v.pendienteDeCierre && (
                      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200/60">
                        Pendiente
                      </span>
                    )}
                    {clickable && (
                      <svg className="h-4 w-4 shrink-0 text-warm-300" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>

                  {v.tieneAsignaciones ? (
                    <div className="mt-2.5 flex flex-col gap-1 border-t border-warm-200/50 pt-2.5 text-[13px]">
                      <div className="flex justify-between">
                        <span className="text-warm-500">Venta</span>
                        <span className="font-medium text-warm-900">{formatCurrency(v.ventaBruta)}</span>
                      </div>
                      {v.gastos > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Gastos</span>
                          <span>-{formatCurrency(v.gastos)}</span>
                        </div>
                      )}
                      {v.transferencias > 0 && (
                        <div className="flex justify-between text-blue-600">
                          <span>Transferencias</span>
                          <span>-{formatCurrency(v.transferencias)}</span>
                        </div>
                      )}
                      {v.descuentos > 0 && (
                        <div className="flex justify-between text-amber-600">
                          <span>Descuentos</span>
                          <span>-{formatCurrency(v.descuentos)}</span>
                        </div>
                      )}
                      <div className="mt-0.5 flex justify-between border-t border-warm-200/50 pt-1.5 font-semibold">
                        <span className="text-warm-700">Efectivo a entregar</span>
                        <span className="font-display text-[15px] text-orange-600">{formatCurrency(v.efectivo)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1.5 pl-5 text-[11px] text-warm-400">
                      {clickable ? 'Sin asignaciones — toca para asignar' : 'Sin asignaciones'}
                    </p>
                  )}
                </>
              )

              return clickable ? (
                <Link
                  key={v.vendedorId}
                  href={`${vendedorHrefPrefix}${v.vendedorId}`}
                  className="block rounded-2xl bg-warm-50/80 p-3.5 ring-1 ring-inset ring-transparent transition-all duration-150 hover:bg-warm-100/70 hover:ring-warm-200/60 active:scale-[0.99]"
                >
                  {body}
                </Link>
              ) : (
                <div
                  key={v.vendedorId}
                  className="rounded-2xl bg-warm-50/80 p-3.5"
                >
                  {body}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Total del día */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-dark p-5 text-white shadow-elevated">
        <div className="pointer-events-none absolute -top-12 -right-10 h-36 w-36 rounded-full bg-amber-500/10 blur-2xl" />
        <div className="relative">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-warm-400">
            Total del día
          </h3>
          <div className="mt-3 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-warm-300">Venta total</span>
              <span className="font-medium">{formatCurrency(totales.ventaBruta)}</span>
            </div>
            {totales.gastos > 0 && (
              <div className="flex justify-between text-red-300">
                <span>Total gastos</span>
                <span>-{formatCurrency(totales.gastos)}</span>
              </div>
            )}
            {totales.transferencias > 0 && (
              <div className="flex justify-between text-blue-300">
                <span>Total transferencias</span>
                <span>-{formatCurrency(totales.transferencias)}</span>
              </div>
            )}
            {totales.descuentos > 0 && (
              <div className="flex justify-between text-amber-300">
                <span>Total descuentos</span>
                <span>-{formatCurrency(totales.descuentos)}</span>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-end justify-between border-t border-warm-700/60 pt-3">
            <span className="text-sm font-medium text-warm-300">Efectivo total</span>
            <span className="font-display text-2xl font-semibold tracking-tight text-amber-400">
              {formatCurrency(totales.efectivo)}
            </span>
          </div>
        </div>
      </div>

      {/* Productos del día */}
      {porProducto.length > 0 && (
        <Card>
          <CardTitle>Productos del día</CardTitle>
          <CardContent className="mt-3">
            <div className="flex flex-col gap-1.5">
              {/* Encabezado */}
              <div className="flex items-center gap-2 px-3.5 text-[11px] font-medium uppercase tracking-wide text-warm-400">
                <span className="flex-1">Producto</span>
                <span className="w-12 text-right">Llevó</span>
                <span className="w-12 text-right">Vendió</span>
                <span className="w-12 text-right">Sobró</span>
              </div>
              {porProducto.map((p) => (
                <div
                  key={p.productoId}
                  className="flex items-center gap-2 rounded-xl bg-warm-50/80 px-3.5 py-2.5 text-sm"
                >
                  <span className="flex-1 truncate font-medium text-warm-800">{p.nombre}</span>
                  <span className="w-12 text-right text-warm-500">{p.llevadas}</span>
                  <span className="w-12 text-right font-semibold text-warm-900">{p.vendidas}</span>
                  <span className="w-12 text-right text-warm-500">{p.sobrantes}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
