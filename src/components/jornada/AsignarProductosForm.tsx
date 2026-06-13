'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Producto, Asignacion } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { formatCurrency } from '@/lib/utils'

interface AsignarProductosFormProps {
  productos: Producto[]
  asignaciones: Asignacion[]
  jornadaId: string
  vendedorId: string
  isAdmin?: boolean
}

export function AsignarProductosForm({
  productos,
  asignaciones,
  jornadaId,
  vendedorId,
  isAdmin = false,
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

    // Skip auth check for admins (server already verified admin status via the page component)
    if (!isAdmin) {
      const { data: { user } } = await supabase.auth.getUser()
      const authVendedorId = user?.user_metadata?.vendedor_id as string | undefined
      if (authVendedorId && authVendedorId !== vendedorId) {
        setError('Sesion invalida. Por favor cierra sesion e ingresa de nuevo.')
        setLoading(false)
        return
      }
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
    // Con params (admin gestionando a un vendedor) volvemos al hub por-vendedor;
    // un vendedor normal vuelve a su inicio (dashboard).
    const search = window.location.search
    router.push(search ? '/jornada' + search : '/dashboard')
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
              className="rounded-2xl bg-[#fffcf8] p-4 shadow-card border border-warm-200/60 transition-shadow duration-150 hover:shadow-card-hover"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-warm-900">
                    {producto.nombre}
                  </h4>
                  <p className="text-xs text-warm-400">
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
                  <span className="text-xs text-warm-500">{cantidad} bandejas</span>
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

      <ErrorAlert message={error} />

      <Button type="submit" loading={loading} size="lg">
        Guardar asignacion
      </Button>
    </form>
  )
}
