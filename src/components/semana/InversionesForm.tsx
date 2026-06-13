'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import type { TipoInversion } from '@/types'

interface InversionItem {
  id: string
  fecha: string
  descripcion: string
  monto: number
  tipo: TipoInversion
}

interface InversionesFormProps {
  semanaId: string
  inversiones: InversionItem[]
  isAdmin: boolean
  isCerrada: boolean
}

export function InversionesForm({
  semanaId,
  inversiones,
  isAdmin,
  isCerrada,
}: InversionesFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [tipo, setTipo] = useState<TipoInversion>('inversion')

  // Single pass to categorize and sum (js-combine-iterations)
  const inversionesList: InversionItem[] = []
  const gastosPersonalesList: InversionItem[] = []
  const gastosGeneralesList: InversionItem[] = []
  let totalInversiones = 0
  let totalGastosPersonales = 0
  let totalGastosGenerales = 0
  for (const i of inversiones) {
    if (i.tipo === 'inversion') {
      inversionesList.push(i)
      totalInversiones += i.monto
    } else if (i.tipo === 'gasto_personal') {
      gastosPersonalesList.push(i)
      totalGastosPersonales += i.monto
    } else {
      gastosGeneralesList.push(i)
      totalGastosGenerales += i.monto
    }
  }

  const tipoLabel: Record<TipoInversion, string> = {
    inversion: 'inversion',
    gasto_personal: 'gasto personal',
    gasto_general: 'gasto general',
  }

  async function handleAgregar() {
    if (!descripcion.trim() || !monto) return
    const montoNum = parseFloat(monto)
    if (isNaN(montoNum) || montoNum <= 0) return

    setLoading(true)
    setError('')

    const { error: insertError } = await supabase.from('inversiones').insert({
      semana_id: semanaId,
      fecha,
      descripcion: descripcion.trim(),
      monto: montoNum,
      tipo,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setDescripcion('')
    setMonto('')
    setLoading(false)
    router.refresh()
    toast(`Registro de ${tipoLabel[tipo]} agregado`)
  }

  async function handleEliminar(id: string) {
    const ok = await confirm({
      title: 'Eliminar registro',
      message: '¿Estas seguro de eliminar este registro?',
      confirmLabel: 'Eliminar',
      variant: 'danger',
    })
    if (!ok) return

    setError('')
    const { error: deleteError } = await supabase
      .from('inversiones')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    router.refresh()
    toast('Registro eliminado')
  }

  function renderList(items: InversionItem[], label: string, total: number) {
    if (items.length === 0) return null
    return (
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium text-warm-700">{label}</h4>
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg bg-warm-50 px-3 py-2"
          >
            <div className="flex flex-col">
              <span className="text-sm text-warm-800">{item.descripcion}</span>
              <span className="text-xs text-warm-500">
                {formatDateShort(item.fecha)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {formatCurrency(item.monto)}
              </span>
              {isAdmin && !isCerrada && (
                <button
                  onClick={() => handleEliminar(item.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
                  aria-label="Eliminar registro"
                >
                  X
                </button>
              )}
            </div>
          </div>
        ))}
        <div className="flex justify-between border-t pt-1 text-sm font-medium">
          <span className="text-warm-600">Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Inversiones existentes */}
      {renderList(inversionesList, 'Inversiones (insumos)', totalInversiones)}
      {renderList(
        gastosGeneralesList,
        'Gastos generales (negocio)',
        totalGastosGenerales,
      )}
      {renderList(
        gastosPersonalesList,
        'Gastos personales',
        totalGastosPersonales,
      )}

      {inversiones.length === 0 && (
        <p className="py-4 text-center text-sm text-warm-500">
          No hay inversiones ni gastos registrados.
        </p>
      )}

      {/* Formulario de agregar */}
      {isAdmin && !isCerrada && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-medium text-warm-900">Registrar</h3>

          <div className="flex flex-col gap-3">
            {/* Tipo */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTipo('inversion')}
                className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                  tipo === 'inversion'
                    ? 'bg-blue-500 text-white'
                    : 'bg-warm-100 text-warm-700'
                }`}
              >
                Inversion
              </button>
              <button
                type="button"
                onClick={() => setTipo('gasto_general')}
                className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                  tipo === 'gasto_general'
                    ? 'bg-amber-500 text-white'
                    : 'bg-warm-100 text-warm-700'
                }`}
              >
                Gasto general
              </button>
              <button
                type="button"
                onClick={() => setTipo('gasto_personal')}
                className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                  tipo === 'gasto_personal'
                    ? 'bg-purple-500 text-white'
                    : 'bg-warm-100 text-warm-700'
                }`}
              >
                Gasto personal
              </button>
            </div>

            {/* Fecha */}
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              label="Fecha"
            />

            {/* Descripcion */}
            <Input
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Compra de verde, queso, pollo"
              label="Descripcion"
            />

            {/* Monto */}
            <Input
              id="monto"
              type="number"
              min="0.01"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              label="Monto ($)"
            />

            <Button onClick={handleAgregar} loading={loading}>
              Agregar {tipoLabel[tipo]}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
