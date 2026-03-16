'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Producto, Asignacion } from '@/types'
import { Button, Input, useToast } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

interface AsignarProductosFormProps {
  productos: Producto[]
  asignaciones: Asignacion[]
  jornadaId: string
  vendedorId: string
}

export function AsignarProductosForm({
  productos,
  asignaciones,
  jornadaId,
  vendedorId,
}: AsignarProductosFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Inicializar cantidades desde las asignaciones existentes
  const initialCantidades: Record<string, string> = {}
  for (const prod of productos) {
    const asig = asignaciones.find((a) => a.producto_id === prod.id)
    initialCantidades[prod.id] = asig ? asig.cantidad_inicial.toString() : ''
  }

  const [cantidades, setCantidades] =
    useState<Record<string, string>>(initialCantidades)

  function handleChange(productoId: string, value: string) {
    setCantidades((prev) => ({
      ...prev,
      [productoId]: value,
    }))
  }

  function calcularTotal(): number {
    return productos.reduce((total, prod) => {
      const cantidad = parseInt(cantidades[prod.id] || '0', 10)
      if (isNaN(cantidad) || cantidad <= 0) return total
      return total + cantidad * prod.precio
    }, 0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Preparar las asignaciones a guardar
    const nuevasAsignaciones = productos
      .filter((prod) => {
        const cantidad = parseInt(cantidades[prod.id] || '0', 10)
        return !isNaN(cantidad) && cantidad > 0
      })
      .map((prod) => ({
        jornada_id: jornadaId,
        vendedor_id: vendedorId,
        producto_id: prod.id,
        cantidad_inicial: parseInt(cantidades[prod.id], 10),
      }))

    if (nuevasAsignaciones.length === 0) {
      setError('Debes asignar al menos un producto')
      setLoading(false)
      return
    }

    // Eliminar asignaciones existentes de este vendedor en esta jornada
    const { error: deleteError } = await supabase
      .from('asignaciones')
      .delete()
      .eq('jornada_id', jornadaId)
      .eq('vendedor_id', vendedorId)

    if (deleteError) {
      setError(deleteError.message)
      setLoading(false)
      return
    }

    // Insertar nuevas asignaciones
    const { error: insertError } = await supabase
      .from('asignaciones')
      .insert(nuevasAsignaciones)

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    toast('Asignacion guardada')
    router.push('/dashboard')
    router.refresh()
  }

  const total = calcularTotal()

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {productos.map((producto) => {
          const cantidad = parseInt(cantidades[producto.id] || '0', 10)
          const subtotal =
            !isNaN(cantidad) && cantidad > 0 ? cantidad * producto.precio : 0

          return (
            <div
              key={producto.id}
              className="rounded-xl bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {producto.nombre}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {producto.unidades_por_bandeja} uds -{' '}
                    {formatCurrency(producto.precio)}/bandeja
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={cantidades[producto.id] || ''}
                    onChange={(e) => handleChange(producto.id, e.target.value)}
                    placeholder="0"
                    className="w-20 text-center"
                    inputMode="numeric"
                  />
                </div>
              </div>
              {subtotal > 0 && (
                <p className="mt-1 text-right text-sm font-medium text-orange-600">
                  {formatCurrency(subtotal)}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Total */}
      <div className="rounded-xl bg-orange-50 p-4">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900">Total potencial</span>
          <span className="text-lg font-bold text-orange-600">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" loading={loading} size="lg">
        Guardar asignacion
      </Button>
    </form>
  )
}
