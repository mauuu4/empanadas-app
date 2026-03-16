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

  // Inicializar sobrantes desde las asignaciones existentes
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

    // Validar que los sobrantes no sean mayores que las cantidades iniciales
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

    // Actualizar sobrantes en cada asignacion
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
  // Check if all sobrantes are filled (user has entered a value for all assignments)
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
            <div key={asig.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {asig.producto.nombre}
                  </h4>
                  <p className="text-sm text-gray-500">
                    Lleva: {asig.cantidad_inicial} bandejas
                  </p>
                </div>
                <div className="text-right">
                  <label className="mb-1 block text-xs text-gray-500">
                    Sobrante
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max={asig.cantidad_inicial}
                    value={sobrantes[asig.id] || ''}
                    onChange={(e) => handleChange(asig.id, e.target.value)}
                    placeholder="0"
                    className="w-20 text-center"
                    inputMode="numeric"
                  />
                </div>
              </div>
              {sobrantes[asig.id] !== '' && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Vendido: {vendido < 0 ? 0 : vendido} bandejas
                  </span>
                  <span className="font-medium text-orange-600">
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
        <div className="rounded-xl bg-orange-50 p-4">
          <h3 className="mb-3 font-semibold text-gray-900">Resumen de venta</h3>

          {/* Product details */}
          <div className="mb-3 flex flex-col gap-1 text-sm">
            {detalles.map((d) => (
              <div key={d.nombre} className="flex justify-between">
                <span className="text-gray-600">
                  {d.nombre} ({d.vendido} vendidas)
                </span>
                <span className="font-medium">{formatCurrency(d.monto)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-orange-200 pt-2">
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between font-medium">
                <span>Venta bruta</span>
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
                <div className="flex justify-between text-yellow-600">
                  <span>(-) Descuentos</span>
                  <span>-{formatCurrency(totalDescuentos)}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between border-t border-orange-200 pt-2 text-base font-bold">
                <span>Efectivo a entregar</span>
                <span className="text-orange-600">
                  {formatCurrency(efectivo)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" loading={loading} size="lg" disabled={!allFilled}>
        Confirmar cierre
      </Button>
    </form>
  )
}
