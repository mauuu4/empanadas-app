'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Producto } from '@/types'
import { Button, Input, useToast } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

interface AsignacionConProducto {
  id: string
  producto_id: string
  cantidad_inicial: number
  cantidad_sobrante: number | null
  producto: Producto
}

interface SobrantesEditorProps {
  asignaciones: AsignacionConProducto[]
  disabled?: boolean
}

export function SobrantesEditor({
  asignaciones,
  disabled = false,
}: SobrantesEditorProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const initial: Record<string, string> = {}
  for (const a of asignaciones) {
    initial[a.id] =
      a.cantidad_sobrante !== null ? a.cantidad_sobrante.toString() : ''
  }
  const [sobrantes, setSobrantes] = useState<Record<string, string>>(initial)

  function handleChange(id: string, value: string) {
    setSobrantes((prev) => ({ ...prev, [id]: value }))
  }

  async function handleGuardar() {
    setLoading(true)
    setError('')

    for (const a of asignaciones) {
      const raw = sobrantes[a.id]
      if (raw === '' || raw === undefined) {
        setError(`Falta sobrante de ${a.producto.nombre}`)
        setLoading(false)
        return
      }
      const sobrante = parseInt(raw, 10)
      if (isNaN(sobrante) || sobrante < 0) {
        setError(`Sobrante invalido para ${a.producto.nombre}`)
        setLoading(false)
        return
      }
      if (sobrante > a.cantidad_inicial) {
        setError(
          `${a.producto.nombre}: sobrante (${sobrante}) mayor que llevado (${a.cantidad_inicial})`,
        )
        setLoading(false)
        return
      }
    }

    for (const a of asignaciones) {
      const sobrante = parseInt(sobrantes[a.id], 10)
      const { error: e } = await supabase
        .from('asignaciones')
        .update({ cantidad_sobrante: sobrante })
        .eq('id', a.id)
      if (e) {
        setError(e.message)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    toast('Sobrantes actualizados')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3">
      {asignaciones.map((a) => {
        const raw = sobrantes[a.id]
        const sobrante = raw === '' ? null : parseInt(raw, 10)
        const vendido =
          sobrante === null || isNaN(sobrante)
            ? null
            : a.cantidad_inicial - sobrante
        return (
          <div
            key={a.id}
            className="rounded-xl bg-gray-50/80 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-gray-900">
                  {a.producto.nombre}
                </h4>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  Lleva: {a.cantidad_inicial} bandejas
                </p>
              </div>
              <div className="shrink-0 text-right">
                <Input
                  type="number"
                  min="0"
                  max={a.cantidad_inicial}
                  value={raw ?? ''}
                  onChange={(e) => handleChange(a.id, e.target.value)}
                  placeholder="0"
                  className="!w-20 text-center !text-base !font-bold"
                  inputMode="numeric"
                  disabled={disabled}
                />
              </div>
            </div>
            {vendido !== null && !isNaN(vendido) && vendido >= 0 && (
              <div className="mt-2 flex justify-between rounded-lg bg-white px-3 py-1.5 text-xs">
                <span className="text-gray-500">Vendido: {vendido}</span>
                <span className="font-semibold text-orange-600">
                  {formatCurrency(vendido * a.producto.precio)}
                </span>
              </div>
            )}
          </div>
        )
      })}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {!disabled && (
        <Button
          onClick={handleGuardar}
          loading={loading}
          size="md"
          variant="secondary"
        >
          Guardar sobrantes
        </Button>
      )}
    </div>
  )
}
