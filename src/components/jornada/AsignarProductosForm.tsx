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

    // Verificar que el usuario autenticado coincide con el vendedor
    const { data: { user } } = await supabase.auth.getUser()
    const authVendedorId = user?.user_metadata?.vendedor_id as string | undefined
    if (authVendedorId && authVendedorId !== vendedorId) {
      setError('Sesion invalida. Por favor cierra sesion e ingresa de nuevo.')
      setLoading(false)
      return
    }

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
              className="rounded-2xl bg-white p-4 shadow-card border border-gray-100/80 transition-shadow duration-150 hover:shadow-card-hover"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {producto.nombre}
                  </h4>
                  <p className="text-xs text-gray-400">
                    {producto.unidades_por_bandeja} uds &middot;{' '}
                    {formatCurrency(producto.precio)}/bandeja
                  </p>
                </div>
                <div className="shrink-0">
                  <Input
                    type="number"
                    min="0"
                    value={cantidades[producto.id] || ''}
                    onChange={(e) => handleChange(producto.id, e.target.value)}
                    placeholder="0"
                    className="!w-20 text-center !text-lg !font-bold"
                    inputMode="numeric"
                  />
                </div>
              </div>
              {subtotal > 0 && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-orange-50/70 px-3 py-1.5">
                  <span className="text-xs text-gray-500">{cantidad} bandejas</span>
                  <span className="text-sm font-semibold text-orange-600">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Total */}
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-orange-100">Total potencial</span>
          <span className="text-xl font-bold text-white">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 ring-1 ring-inset ring-red-200/60">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <Button type="submit" loading={loading} size="lg">
        Guardar asignacion
      </Button>
    </form>
  )
}
