'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Gasto, Transferencia, Descuento } from '@/types'
import { Button, Input, useToast, useConfirm } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

type TipoMovimiento = 'gasto' | 'transferencia' | 'descuento'

interface MovimientosFormProps {
  jornadaId: string
  vendedorId: string
  gastos: Gasto[]
  transferencias: Transferencia[]
  descuentos: Descuento[]
}

type MovimientoUnificado = {
  id: string
  tipo: TipoMovimiento
  descripcion: string | null
  monto: number
  created_at: string
}

function buildMovimientos(
  gastos: Gasto[],
  transferencias: Transferencia[],
  descuentos: Descuento[],
): MovimientoUnificado[] {
  return [
    ...gastos.map((g) => ({
      id: g.id,
      tipo: 'gasto' as TipoMovimiento,
      descripcion: g.descripcion,
      monto: g.monto,
      created_at: g.created_at,
    })),
    ...transferencias.map((t) => ({
      id: t.id,
      tipo: 'transferencia' as TipoMovimiento,
      descripcion: t.descripcion,
      monto: t.monto,
      created_at: t.created_at,
    })),
    ...descuentos.map((d) => ({
      id: d.id,
      tipo: 'descuento' as TipoMovimiento,
      descripcion: d.descripcion,
      monto: d.monto,
      created_at: d.created_at,
    })),
  ].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}

export function MovimientosForm({
  jornadaId,
  vendedorId,
  gastos: gastosIniciales,
  transferencias: transferenciasIniciales,
  descuentos: descuentosIniciales,
}: MovimientosFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const { confirm } = useConfirm()

  const [tipo, setTipo] = useState<TipoMovimiento>('gasto')
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Local state for movements — allows optimistic / immediate updates
  const [movimientos, setMovimientos] = useState<MovimientoUnificado[]>(
    buildMovimientos(
      gastosIniciales,
      transferenciasIniciales,
      descuentosIniciales,
    ),
  )

  const totalGastos = movimientos
    .filter((m) => m.tipo === 'gasto')
    .reduce((sum, m) => sum + m.monto, 0)
  const totalTransferencias = movimientos
    .filter((m) => m.tipo === 'transferencia')
    .reduce((sum, m) => sum + m.monto, 0)
  const totalDescuentos = movimientos
    .filter((m) => m.tipo === 'descuento')
    .reduce((sum, m) => sum + m.monto, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const montoNum = parseFloat(monto)
    if (isNaN(montoNum) || montoNum <= 0) {
      setError('El monto debe ser mayor a 0')
      return
    }

    if (tipo === 'gasto' && !descripcion.trim()) {
      setError('La descripcion es requerida para gastos')
      return
    }

    setLoading(true)

    let insertError
    let insertedId: string | null = null

    if (tipo === 'gasto') {
      const { data, error } = await supabase
        .from('gastos')
        .insert({
          jornada_id: jornadaId,
          vendedor_id: vendedorId,
          descripcion: descripcion.trim(),
          monto: montoNum,
        })
        .select('id, created_at')
        .single()
      insertError = error
      insertedId = data?.id ?? null
      if (data) {
        setMovimientos((prev) => [
          ...prev,
          {
            id: data.id,
            tipo: 'gasto',
            descripcion: descripcion.trim(),
            monto: montoNum,
            created_at: data.created_at,
          },
        ])
      }
    } else if (tipo === 'transferencia') {
      const { data, error } = await supabase
        .from('transferencias')
        .insert({
          jornada_id: jornadaId,
          vendedor_id: vendedorId,
          monto: montoNum,
          descripcion: descripcion.trim() || null,
        })
        .select('id, created_at')
        .single()
      insertError = error
      insertedId = data?.id ?? null
      if (data) {
        setMovimientos((prev) => [
          ...prev,
          {
            id: data.id,
            tipo: 'transferencia',
            descripcion: descripcion.trim() || null,
            monto: montoNum,
            created_at: data.created_at,
          },
        ])
      }
    } else {
      const { data, error } = await supabase
        .from('descuentos')
        .insert({
          jornada_id: jornadaId,
          vendedor_id: vendedorId,
          monto: montoNum,
          descripcion: descripcion.trim() || null,
        })
        .select('id, created_at')
        .single()
      insertError = error
      insertedId = data?.id ?? null
      if (data) {
        setMovimientos((prev) => [
          ...prev,
          {
            id: data.id,
            tipo: 'descuento',
            descripcion: descripcion.trim() || null,
            monto: montoNum,
            created_at: data.created_at,
          },
        ])
      }
    }

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setDescripcion('')
    setMonto('')
    setLoading(false)
    const labels = {
      gasto: 'Gasto',
      transferencia: 'Transferencia',
      descuento: 'Descuento',
    }
    toast(`${labels[tipo]} agregado`)
  }

  async function handleDelete(tipoMov: TipoMovimiento, id: string) {
    const labels = {
      gasto: 'gasto',
      transferencia: 'transferencia',
      descuento: 'descuento',
    }
    const ok = await confirm({
      title: `Eliminar ${labels[tipoMov]}`,
      message: `¿Estas seguro de eliminar este ${labels[tipoMov]}?`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
    })
    if (!ok) return

    setDeletingId(id)
    const table =
      tipoMov === 'gasto'
        ? 'gastos'
        : tipoMov === 'transferencia'
          ? 'transferencias'
          : 'descuentos'

    const { error } = await supabase.from(table).delete().eq('id', id)

    if (!error) {
      // Remove from local state immediately
      setMovimientos((prev) => prev.filter((m) => m.id !== id))
    }

    setDeletingId(null)
    toast('Eliminado')
  }

  const tipoLabels: Record<TipoMovimiento, string> = {
    gasto: 'Gasto',
    transferencia: 'Transferencia',
    descuento: 'Descuento',
  }

  const tipoColors: Record<TipoMovimiento, string> = {
    gasto: 'bg-red-100 text-red-700',
    transferencia: 'bg-blue-100 text-blue-700',
    descuento: 'bg-yellow-100 text-yellow-700',
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Formulario */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col gap-3">
          {/* Type select */}
          <div>
            <label
              htmlFor="tipo"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Tipo de movimiento
            </label>
            <select
              id="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoMovimiento)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            >
              <option value="gasto">Gasto</option>
              <option value="transferencia">Transferencia</option>
              <option value="descuento">Descuento</option>
            </select>
          </div>

          <Input
            id="descripcion"
            label={tipo === 'gasto' ? 'Descripcion' : 'Descripcion (opcional)'}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder={
              tipo === 'gasto'
                ? 'Ej: Refrigerio'
                : tipo === 'transferencia'
                  ? 'Ej: Pago cliente Maria'
                  : 'Ej: Empanadas a $1.50'
            }
            required={tipo === 'gasto'}
          />
          <Input
            id="monto"
            label="Monto ($)"
            type="number"
            min="0.01"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
            required
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" loading={loading}>
            Agregar {tipoLabels[tipo].toLowerCase()}
          </Button>
        </div>
      </form>

      {/* Lista unificada de movimientos */}
      {movimientos.length > 0 && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-medium text-gray-900">
            Movimientos registrados
          </h3>
          <div className="flex flex-col gap-2">
            {movimientos.map((mov) => (
              <div
                key={mov.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tipoColors[mov.tipo]}`}
                    >
                      {tipoLabels[mov.tipo]}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(mov.monto)}
                    </span>
                  </div>
                  {mov.descripcion && (
                    <span className="text-xs text-gray-500">
                      {mov.descripcion}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(mov.tipo, mov.id)}
                  disabled={deletingId === mov.id}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  aria-label="Eliminar"
                >
                  {deletingId === mov.id ? '...' : 'X'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumen */}
      {(totalGastos > 0 || totalTransferencias > 0 || totalDescuentos > 0) && (
        <div className="rounded-xl bg-gray-50 p-4">
          <h3 className="mb-2 font-medium text-gray-900">
            Resumen de movimientos
          </h3>
          <div className="flex flex-col gap-1 text-sm">
            {totalGastos > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Gastos</span>
                <span className="text-red-600">
                  -{formatCurrency(totalGastos)}
                </span>
              </div>
            )}
            {totalTransferencias > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Transferencias</span>
                <span className="text-blue-600">
                  -{formatCurrency(totalTransferencias)}
                </span>
              </div>
            )}
            {totalDescuentos > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Descuentos</span>
                <span className="text-yellow-600">
                  -{formatCurrency(totalDescuentos)}
                </span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t pt-1 font-medium">
              <span className="text-gray-900">Total deducciones</span>
              <span className="text-gray-900">
                -
                {formatCurrency(
                  totalGastos + totalTransferencias + totalDescuentos,
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
