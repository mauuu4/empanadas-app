'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, useToast, useConfirm } from '@/components/ui'
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

  const inversionesList = inversiones.filter((i) => i.tipo === 'inversion')
  const gastosPersonalesList = inversiones.filter(
    (i) => i.tipo === 'gasto_personal',
  )

  const totalInversiones = inversionesList.reduce((sum, i) => sum + i.monto, 0)
  const totalGastosPersonales = gastosPersonalesList.reduce(
    (sum, i) => sum + i.monto,
    0,
  )

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
    toast(
      tipo === 'inversion'
        ? 'Inversion registrada'
        : 'Gasto personal registrado',
    )
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
        <h4 className="text-sm font-medium text-gray-700">{label}</h4>
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
          >
            <div className="flex flex-col">
              <span className="text-sm text-gray-800">{item.descripcion}</span>
              <span className="text-xs text-gray-500">
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
          <span className="text-gray-600">Total</span>
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
        gastosPersonalesList,
        'Gastos personales',
        totalGastosPersonales,
      )}

      {inversiones.length === 0 && (
        <p className="py-4 text-center text-sm text-gray-500">
          No hay inversiones ni gastos personales registrados.
        </p>
      )}

      {/* Formulario de agregar */}
      {isAdmin && !isCerrada && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-medium text-gray-900">Registrar</h3>

          <div className="flex flex-col gap-3">
            {/* Tipo */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTipo('inversion')}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  tipo === 'inversion'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Inversion
              </button>
              <button
                type="button"
                onClick={() => setTipo('gasto_personal')}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  tipo === 'gasto_personal'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-700'
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
              Agregar {tipo === 'inversion' ? 'inversion' : 'gasto personal'}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
