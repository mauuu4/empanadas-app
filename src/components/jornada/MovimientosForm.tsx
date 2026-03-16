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

  const [tab, setTab] = useState<TipoMovimiento>('gasto')
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const tabs: { key: TipoMovimiento; label: string }[] = [
    { key: 'gasto', label: 'Gastos' },
    { key: 'transferencia', label: 'Transf.' },
    { key: 'descuento', label: 'Descuentos' },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const montoNum = parseFloat(monto)
    if (isNaN(montoNum) || montoNum <= 0) {
      setError('El monto debe ser mayor a 0')
      return
    }

    if (tab === 'gasto' && !descripcion.trim()) {
      setError('La descripcion es requerida para gastos')
      return
    }

    setLoading(true)

    let insertError
    if (tab === 'gasto') {
      const { error } = await supabase.from('gastos').insert({
        jornada_id: jornadaId,
        vendedor_id: vendedorId,
        descripcion: descripcion.trim(),
        monto: montoNum,
      })
      insertError = error
    } else if (tab === 'transferencia') {
      const { error } = await supabase.from('transferencias').insert({
        jornada_id: jornadaId,
        vendedor_id: vendedorId,
        monto: montoNum,
        descripcion: descripcion.trim() || null,
      })
      insertError = error
    } else {
      const { error } = await supabase.from('descuentos').insert({
        jornada_id: jornadaId,
        vendedor_id: vendedorId,
        monto: montoNum,
        descripcion: descripcion.trim() || null,
      })
      insertError = error
    }

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setDescripcion('')
    setMonto('')
    setLoading(false)
    router.refresh()
    const labels = {
      gasto: 'Gasto',
      transferencia: 'Transferencia',
      descuento: 'Descuento',
    }
    toast(`${labels[tab]} agregado`)
  }

  async function handleDelete(tipo: TipoMovimiento, id: string) {
    const labels = {
      gasto: 'gasto',
      transferencia: 'transferencia',
      descuento: 'descuento',
    }
    const ok = await confirm({
      title: `Eliminar ${labels[tipo]}`,
      message: `¿Estas seguro de eliminar este ${labels[tipo]}?`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
    })
    if (!ok) return

    setDeletingId(id)
    const table =
      tipo === 'gasto'
        ? 'gastos'
        : tipo === 'transferencia'
          ? 'transferencias'
          : 'descuentos'

    await supabase.from(table).delete().eq('id', id)
    setDeletingId(null)
    router.refresh()
    toast('Eliminado')
  }

  const totalGastos = gastosIniciales.reduce((sum, g) => sum + g.monto, 0)
  const totalTransferencias = transferenciasIniciales.reduce(
    (sum, t) => sum + t.monto,
    0,
  )
  const totalDescuentos = descuentosIniciales.reduce(
    (sum, d) => sum + d.monto,
    0,
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex rounded-lg bg-gray-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Formulario */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col gap-3">
          <Input
            id="descripcion"
            label={tab === 'gasto' ? 'Descripcion' : 'Descripcion (opcional)'}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder={
              tab === 'gasto'
                ? 'Ej: Refrigerio'
                : tab === 'transferencia'
                  ? 'Ej: Pago cliente Maria'
                  : 'Ej: Empanadas a $1.50'
            }
            required={tab === 'gasto'}
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
            Agregar{' '}
            {tab === 'gasto'
              ? 'gasto'
              : tab === 'transferencia'
                ? 'transferencia'
                : 'descuento'}
          </Button>
        </div>
      </form>

      {/* Lista de gastos */}
      {gastosIniciales.length > 0 && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Gastos</h3>
            <span className="text-sm font-medium text-red-600">
              -{formatCurrency(totalGastos)}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {gastosIniciales.map((gasto) => (
              <div
                key={gasto.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
              >
                <span className="text-sm text-gray-700">
                  {gasto.descripcion}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {formatCurrency(gasto.monto)}
                  </span>
                  <button
                    onClick={() => handleDelete('gasto', gasto.id)}
                    disabled={deletingId === gasto.id}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                    aria-label="Eliminar gasto"
                  >
                    {deletingId === gasto.id ? '...' : 'X'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de transferencias */}
      {transferenciasIniciales.length > 0 && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Transferencias</h3>
            <span className="text-sm font-medium text-blue-600">
              -{formatCurrency(totalTransferencias)}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {transferenciasIniciales.map((trans) => (
              <div
                key={trans.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
              >
                <span className="text-sm text-gray-700">
                  {trans.descripcion || 'Transferencia'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {formatCurrency(trans.monto)}
                  </span>
                  <button
                    onClick={() => handleDelete('transferencia', trans.id)}
                    disabled={deletingId === trans.id}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                    aria-label="Eliminar transferencia"
                  >
                    {deletingId === trans.id ? '...' : 'X'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de descuentos */}
      {descuentosIniciales.length > 0 && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Descuentos</h3>
            <span className="text-sm font-medium text-yellow-600">
              -{formatCurrency(totalDescuentos)}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {descuentosIniciales.map((desc) => (
              <div
                key={desc.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
              >
                <span className="text-sm text-gray-700">
                  {desc.descripcion || 'Descuento'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {formatCurrency(desc.monto)}
                  </span>
                  <button
                    onClick={() => handleDelete('descuento', desc.id)}
                    disabled={deletingId === desc.id}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                    aria-label="Eliminar descuento"
                  >
                    {deletingId === desc.id ? '...' : 'X'}
                  </button>
                </div>
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
