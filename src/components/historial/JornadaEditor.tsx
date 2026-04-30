'use client'

import { useState } from 'react'
import { Card, CardContent, CardTitle } from '@/components/ui'
import { SobrantesEditor } from '@/components/historial/SobrantesEditor'
import { MovimientosForm } from '@/components/jornada/MovimientosForm'
import { CierreDiaForm } from '@/components/jornada/CierreDiaForm'
import { formatCurrency } from '@/lib/utils'
import type {
  Producto,
  Gasto,
  Transferencia,
  Descuento,
  Paga,
} from '@/types'

interface AsignacionConProducto {
  id: string
  vendedor_id: string
  producto_id: string
  cantidad_inicial: number
  cantidad_sobrante: number | null
  producto: Producto
}

interface VendedorJornadaData {
  id: string
  nombre: string
  asignaciones: AsignacionConProducto[]
  gastos: Gasto[]
  transferencias: Transferencia[]
  descuentos: Descuento[]
}

interface JornadaEditorProps {
  jornadaId: string
  fechaJornada: string
  semanaId: string
  semanaCerrada: boolean
  jornadaCerrada: boolean
  vendedoresData: VendedorJornadaData[]
  todosVendedores: { id: string; nombre: string }[]
  pagasExistentes: Paga[]
  montoAlcancia: number
  valorAdicional: number
  efectivoTotal: number
}

export function JornadaEditor({
  jornadaId,
  fechaJornada,
  semanaId,
  semanaCerrada,
  jornadaCerrada,
  vendedoresData,
  todosVendedores,
  pagasExistentes,
  montoAlcancia,
  valorAdicional,
  efectivoTotal,
}: JornadaEditorProps) {
  const disabled = semanaCerrada
  const [vendedorActivoId, setVendedorActivoId] = useState<string | null>(
    vendedoresData[0]?.id ?? null,
  )

  const vendedorActivo = vendedoresData.find((v) => v.id === vendedorActivoId)

  function ventaBrutaDe(v: VendedorJornadaData) {
    return v.asignaciones.reduce((sum, a) => {
      if (a.cantidad_sobrante === null) return sum
      return (
        sum + (a.cantidad_inicial - a.cantidad_sobrante) * a.producto.precio
      )
    }, 0)
  }

  return (
    <div className="flex flex-col gap-5">
      {vendedoresData.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-gray-500">
              No hay vendedores con asignaciones en esta jornada.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardTitle>Vendedor</CardTitle>
          <CardContent className="mt-3 flex flex-col gap-4">
            {/* Selector de vendedor */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {vendedoresData.map((v) => {
                const active = v.id === vendedorActivoId
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVendedorActivoId(v.id)}
                    className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-150 ${
                      active
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {v.nombre}
                  </button>
                )
              })}
            </div>

            {vendedorActivo && (
              <>
                {/* Resumen del vendedor */}
                <div className="flex items-center justify-between rounded-xl bg-orange-50 px-3.5 py-2.5">
                  <span className="text-xs font-medium text-gray-600">
                    Venta bruta
                  </span>
                  <span className="text-sm font-bold text-orange-600">
                    {formatCurrency(ventaBrutaDe(vendedorActivo))}
                  </span>
                </div>

                {/* Sobrantes */}
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Sobrantes
                  </h4>
                  <SobrantesEditor
                    key={`sobrantes-${vendedorActivo.id}`}
                    asignaciones={vendedorActivo.asignaciones}
                    disabled={disabled}
                  />
                </div>

                {/* Movimientos */}
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Movimientos
                  </h4>
                  {disabled ? (
                    <MovimientosListReadOnly
                      gastos={vendedorActivo.gastos}
                      transferencias={vendedorActivo.transferencias}
                      descuentos={vendedorActivo.descuentos}
                    />
                  ) : (
                    <MovimientosForm
                      key={`mov-${vendedorActivo.id}`}
                      jornadaId={jornadaId}
                      vendedorId={vendedorActivo.id}
                      gastos={vendedorActivo.gastos}
                      transferencias={vendedorActivo.transferencias}
                      descuentos={vendedorActivo.descuentos}
                    />
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <CierreDiaForm
        jornadaId={jornadaId}
        fechaJornada={fechaJornada}
        semanaId={semanaId}
        semanaCerrada={semanaCerrada}
        efectivoTotal={efectivoTotal}
        montoAlcancia={montoAlcancia}
        valorAdicional={valorAdicional}
        pagasExistentes={pagasExistentes.map((p) => ({
          id: p.id,
          persona: p.persona,
          monto: p.monto,
        }))}
        trabajadores={todosVendedores}
        isAdmin={true}
        isCerrada={jornadaCerrada}
        permitirEdicion={!semanaCerrada}
      />
    </div>
  )
}

function MovimientosListReadOnly({
  gastos,
  transferencias,
  descuentos,
}: {
  gastos: Gasto[]
  transferencias: Transferencia[]
  descuentos: Descuento[]
}) {
  const items = [
    ...gastos.map((g) => ({ ...g, tipo: 'Gasto', color: 'text-red-600' })),
    ...transferencias.map((t) => ({
      ...t,
      tipo: 'Transferencia',
      color: 'text-blue-600',
    })),
    ...descuentos.map((d) => ({
      ...d,
      tipo: 'Descuento',
      color: 'text-amber-600',
    })),
  ]

  if (items.length === 0) {
    return (
      <p className="rounded-xl bg-gray-50/80 px-3 py-2 text-xs text-gray-400">
        Sin movimientos registrados.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((m) => (
        <div
          key={m.id}
          className="flex items-center justify-between rounded-xl bg-gray-50/80 px-3 py-2"
        >
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase text-gray-500">
              {m.tipo}
            </span>
            {m.descripcion && (
              <span className="text-xs text-gray-400">{m.descripcion}</span>
            )}
          </div>
          <span className={`text-sm font-semibold ${m.color}`}>
            -{formatCurrency(m.monto)}
          </span>
        </div>
      ))}
    </div>
  )
}
