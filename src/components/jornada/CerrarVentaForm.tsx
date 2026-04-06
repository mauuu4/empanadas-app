'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Producto } from '@/types'
import { Button, Input, useToast, useConfirm } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

interface AsignacionConProducto {
  id: string
  producto_id: string
  cantidad_inicial: number
  cantidad_sobrante: number | null
  producto: Producto
}

interface CerrarVentaFormProps {
  asignaciones: AsignacionConProducto[]
  jornadaId: string
  vendedorId: string
  totalGastos: number
  totalTransferencias: number
  totalDescuentos: number
}

export function CerrarVentaForm({
  asignaciones,
  totalGastos,
  totalTransferencias,
  totalDescuentos,
}: CerrarVentaFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const initialSobrantes: Record<string, string> = {}
  for (const asig of asignaciones) {
    initialSobrantes[asig.id] =
      asig.cantidad_sobrante !== null ? asig.cantidad_sobrante.toString() : ''
  }

  const [sobrantes, setSobrantes] =
    useState<Record<string, string>>(initialSobrantes)

  function handleChange(asignacionId: string, value: string) {
    setSobrantes((prev) => ({
      ...prev,
      [asignacionId]: value,
    }))
  }

  function calcularResumen() {
    let ventaBruta = 0
    const detalles: {
      nombre: string
      inicial: number
      sobrante: number
      vendido: number
      monto: number
    }[] = []

    for (const asig of asignaciones) {
      const sobrante = parseInt(sobrantes[asig.id] || '0', 10)
      const sobranteVal = isNaN(sobrante) ? 0 : sobrante
      const vendido = asig.cantidad_inicial - sobranteVal
      const monto = vendido * asig.producto.precio

      detalles.push({
        nombre: asig.producto.nombre,
        inicial: asig.cantidad_inicial,
        sobrante: sobranteVal,
        vendido,
        monto,
      })

      ventaBruta += monto
    }

    const efectivo =
      ventaBruta - totalGastos - totalTransferencias - totalDescuentos

    return { detalles, ventaBruta, efectivo }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const ok = await confirm({
      title: 'Confirmar cierre de venta',
      message:
        '¿Estas seguro de cerrar la venta? Los sobrantes quedaran registrados.',
      confirmLabel: 'Cerrar venta',
    })
    if (!ok) return

    setLoading(true)
    setError('')

    for (const asig of asignaciones) {
      const sobrante = parseInt(sobrantes[asig.id] || '0', 10)
      if (isNaN(sobrante) || sobrante < 0) {
        setError(`Sobrante invalido para ${asig.producto.nombre}`)
        setLoading(false)
        return
      }
      if (sobrante > asig.cantidad_inicial) {
        setError(
          `Sobrante de ${asig.producto.nombre} no puede ser mayor a ${asig.cantidad_inicial}`,
        )
        setLoading(false)
        return
      }
    }

    for (const asig of asignaciones) {
      const sobrante = parseInt(sobrantes[asig.id] || '0', 10)
      const { error: updateError } = await supabase
        .from('asignaciones')
        .update({ cantidad_sobrante: isNaN(sobrante) ? 0 : sobrante })
        .eq('id', asig.id)

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    toast('Venta cerrada correctamente')
    router.push('/dashboard')
    router.refresh()
  }

  const { detalles, ventaBruta, efectivo } = calcularResumen()
  const allFilled = asignaciones.every(
    (asig) => sobrantes[asig.id] !== undefined && sobrantes[asig.id] !== '',
  )

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Products with sobrantes */}
      <div className="flex flex-col gap-3">
        {asignaciones.map((asig) => {
          const sobrante = parseInt(sobrantes[asig.id] || '0', 10)
          const vendido =
            asig.cantidad_inicial - (isNaN(sobrante) ? 0 : sobrante)

          return (
            <div key={asig.id} className="rounded-2xl bg-white p-4 shadow-card border border-gray-100/80">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {asig.producto.nombre}
                  </h4>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Lleva: {asig.cantidad_inicial} bandejas
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <label className="mb-1.5 block text-[11px] font-medium text-gray-400">
                    Sobrante
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max={asig.cantidad_inicial}
                    value={sobrantes[asig.id] || ''}
                    onChange={(e) => handleChange(asig.id, e.target.value)}
                    placeholder="0"
                    className="!w-20 text-center !text-lg !font-bold"
                    inputMode="numeric"
                  />
                </div>
              </div>
              {sobrantes[asig.id] !== '' && (
                <div className="mt-2.5 flex justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-sm">
                  <span className="text-gray-500">
                    Vendido: {vendido < 0 ? 0 : vendido}
                  </span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrency(
                      (vendido < 0 ? 0 : vendido) * asig.producto.precio,
                    )}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary */}
      {allFilled && (
        <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 p-4 ring-1 ring-inset ring-orange-200/60 animate-slide-up">
          <h3 className="text-sm font-semibold text-gray-900">Resumen de venta</h3>

          <div className="mt-3 flex flex-col gap-1.5 text-sm">
            {detalles.map((d) => (
              <div key={d.nombre} className="flex justify-between">
                <span className="text-gray-500">
                  {d.nombre} ({d.vendido} vendidas)
                </span>
                <span className="font-medium text-gray-700">{formatCurrency(d.monto)}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 border-t border-orange-200/60 pt-3">
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between font-medium">
                <span className="text-gray-700">Venta bruta</span>
                <span>{formatCurrency(ventaBruta)}</span>
              </div>
              {totalGastos > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>(-) Gastos</span>
                  <span>-{formatCurrency(totalGastos)}</span>
                </div>
              )}
              {totalTransferencias > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>(-) Transferencias</span>
                  <span>-{formatCurrency(totalTransferencias)}</span>
                </div>
              )}
              {totalDescuentos > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>(-) Descuentos</span>
                  <span>-{formatCurrency(totalDescuentos)}</span>
                </div>
              )}
              <div className="mt-1.5 flex justify-between rounded-xl bg-white/70 px-3 py-2 text-base font-bold">
                <span className="text-gray-900">Efectivo a entregar</span>
                <span className="text-orange-600">
                  {formatCurrency(efectivo)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 ring-1 ring-inset ring-red-200/60">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <Button type="submit" loading={loading} size="lg" disabled={!allFilled}>
        Confirmar cierre
      </Button>
    </form>
  )
}
