'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Gasto, Transferencia, Descuento } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { formatCurrency } from '@/lib/utils'
import {
  GASTO_CATEGORIAS,
  GASTO_CATEGORIA_MAP,
  type GastoCategoria,
} from '@/lib/constants'

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
  categoria: GastoCategoria | null
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
      categoria: g.categoria,
      monto: g.monto,
      created_at: g.created_at,
    })),
    ...transferencias.map((t) => ({
      id: t.id,
      tipo: 'transferencia' as TipoMovimiento,
      descripcion: t.descripcion,
      categoria: null,
      monto: t.monto,
      created_at: t.created_at,
    })),
    ...descuentos.map((d) => ({
      id: d.id,
      tipo: 'descuento' as TipoMovimiento,
      descripcion: d.descripcion,
      categoria: null,
      monto: d.monto,
      created_at: d.created_at,
    })),
  ].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}

const tipoLabels: Record<TipoMovimiento, string> = {
  gasto: 'Gasto',
  transferencia: 'Transferencia',
  descuento: 'Descuento',
}

const tipoColors: Record<TipoMovimiento, string> = {
  gasto: 'bg-red-50 text-red-700 ring-red-200/60',
  transferencia: 'bg-blue-50 text-blue-700 ring-blue-200/60',
  descuento: 'bg-amber-50 text-amber-700 ring-amber-200/60',
}

const tipoToTable: Record<TipoMovimiento, 'gastos' | 'transferencias' | 'descuentos'> = {
  gasto: 'gastos',
  transferencia: 'transferencias',
  descuento: 'descuentos',
}

export function MovimientosForm({
  jornadaId,
  vendedorId,
  gastos: gastosIniciales,
  transferencias: transferenciasIniciales,
  descuentos: descuentosIniciales,
}: MovimientosFormProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const { confirm } = useConfirm()

  const [tipo, setTipo] = useState<TipoMovimiento>('gasto')
  const [categoria, setCategoria] = useState<GastoCategoria>('comida')
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [movimientos, setMovimientos] = useState<MovimientoUnificado[]>(
    buildMovimientos(
      gastosIniciales,
      transferenciasIniciales,
      descuentosIniciales,
    ),
  )

  // Single pass over movimientos (js-combine-iterations)
  let totalGastos = 0
  let totalTransferencias = 0
  let totalDescuentos = 0
  for (const m of movimientos) {
    if (m.tipo === 'gasto') totalGastos += m.monto
    else if (m.tipo === 'transferencia') totalTransferencias += m.monto
    else totalDescuentos += m.monto
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const montoNum = parseFloat(monto)
    if (isNaN(montoNum) || montoNum <= 0) {
      setError('El monto debe ser mayor a 0')
      return
    }

    setLoading(true)

    // Unified insert — la tabla cambia segun el tipo. Solo los gastos llevan
    // categoria; la descripcion es siempre opcional.
    const table = tipoToTable[tipo]
    const desc = descripcion.trim() || null
    const payload =
      tipo === 'gasto'
        ? {
            jornada_id: jornadaId,
            vendedor_id: vendedorId,
            descripcion: desc,
            categoria,
            monto: montoNum,
          }
        : {
            jornada_id: jornadaId,
            vendedor_id: vendedorId,
            descripcion: desc,
            monto: montoNum,
          }

    const { data, error: insertError } = await supabase
      .from(table)
      .insert(payload as never) // `as never` needed because Supabase overloads .from() by literal table name
      .select('id, created_at')
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    if (data) {
      setMovimientos((prev) => [
        ...prev,
        {
          id: (data as { id: string; created_at: string }).id,
          tipo,
          descripcion: desc,
          categoria: tipo === 'gasto' ? categoria : null,
          monto: montoNum,
          created_at: (data as { id: string; created_at: string }).created_at,
        },
      ])
    }

    setDescripcion('')
    setMonto('')
    setLoading(false)
    toast(`${tipoLabels[tipo]} agregado`)
  }

  async function handleDelete(tipoMov: TipoMovimiento, id: string) {
    const ok = await confirm({
      title: `Eliminar ${tipoLabels[tipoMov].toLowerCase()}`,
      message: `¿Estas seguro de eliminar este ${tipoLabels[tipoMov].toLowerCase()}?`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
    })
    if (!ok) return

    setDeletingId(id)
    const table = tipoToTable[tipoMov]

    const { error } = await supabase.from(table).delete().eq('id', id)

    if (!error) {
      setMovimientos((prev) => prev.filter((m) => m.id !== id))
    }

    setDeletingId(null)
    toast('Eliminado')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Formulario */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-[#fffcf8] p-4 shadow-card border border-warm-200/60"
      >
        <div className="flex flex-col gap-3">
          {/* Type select */}
          <div>
            <label
              htmlFor="tipo"
              className="mb-1.5 block text-sm font-medium text-warm-700"
            >
              Tipo de movimiento
            </label>
            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-warm-100/80 p-1">
              {(['gasto', 'transferencia', 'descuento'] as TipoMovimiento[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`rounded-lg px-2 py-2 text-xs font-semibold transition-all duration-150 ${
                    tipo === t
                      ? 'bg-white text-warm-900 shadow-sm'
                      : 'text-warm-500 hover:text-warm-700'
                  }`}
                >
                  {tipoLabels[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Categoria — solo para gastos */}
          {tipo === 'gasto' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-warm-700">
                Categoria
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {GASTO_CATEGORIAS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategoria(c.value)}
                    className={`flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold ring-1 ring-inset transition-all duration-150 active:scale-[0.97] ${
                      categoria === c.value
                        ? 'bg-amber-50 text-amber-700 ring-amber-300'
                        : 'bg-warm-50/80 text-warm-500 ring-warm-200/60 hover:text-warm-700'
                    }`}
                  >
                    <span aria-hidden>{c.emoji}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Input
            id="descripcion"
            label="Descripcion (opcional)"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder={
              tipo === 'gasto'
                ? 'Ej: comida para el dia'
                : tipo === 'transferencia'
                  ? 'Ej: Pago cliente Maria'
                  : 'Ej: Empanadas a $1.50'
            }
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
          <ErrorAlert message={error} />
          <Button type="submit" loading={loading}>
            Agregar {tipoLabels[tipo].toLowerCase()}
          </Button>
        </div>
      </form>

      {/* Lista unificada de movimientos */}
      {movimientos.length > 0 && (
        <div className="rounded-2xl bg-[#fffcf8] p-4 shadow-card border border-warm-200/60">
          <h3 className="mb-3 text-[15px] font-semibold text-warm-900">
            Movimientos registrados
          </h3>
          <div className="flex flex-col gap-2">
            {movimientos.map((mov) => (
              <div
                key={mov.id}
                className="flex items-center justify-between rounded-xl bg-warm-50/80 px-3 py-2.5 transition-colors animate-fade-in"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tipoColors[mov.tipo]}`}
                    >
                      {tipoLabels[mov.tipo]}
                    </span>
                    {mov.tipo === 'gasto' && mov.categoria && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-warm-100 px-2 py-0.5 text-[11px] font-medium text-warm-600">
                        <span aria-hidden>{GASTO_CATEGORIA_MAP[mov.categoria].emoji}</span>
                        {GASTO_CATEGORIA_MAP[mov.categoria].label}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-warm-900">
                      {formatCurrency(mov.monto)}
                    </span>
                  </div>
                  {mov.descripcion && (
                    <span className="text-xs text-warm-500">
                      {mov.descripcion}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(mov.tipo, mov.id)}
                  disabled={deletingId === mov.id}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-warm-400 transition-all hover:bg-red-50 hover:text-red-500 disabled:opacity-50 active:scale-90"
                  aria-label="Eliminar"
                >
                  {deletingId === mov.id ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-warm-300 border-t-warm-500" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumen */}
      {(totalGastos > 0 || totalTransferencias > 0 || totalDescuentos > 0) && (
        <div className="rounded-2xl bg-warm-50 p-4 ring-1 ring-inset ring-warm-200/60">
          <h3 className="mb-2 text-sm font-semibold text-warm-900">
            Resumen de movimientos
          </h3>
          <div className="flex flex-col gap-1.5 text-sm">
            {totalGastos > 0 && (
              <div className="flex justify-between">
                <span className="text-warm-500">Gastos</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(totalGastos)}
                </span>
              </div>
            )}
            {totalTransferencias > 0 && (
              <div className="flex justify-between">
                <span className="text-warm-500">Transferencias</span>
                <span className="font-medium text-blue-600">
                  -{formatCurrency(totalTransferencias)}
                </span>
              </div>
            )}
            {totalDescuentos > 0 && (
              <div className="flex justify-between">
                <span className="text-warm-500">Descuentos</span>
                <span className="font-medium text-amber-600">
                  -{formatCurrency(totalDescuentos)}
                </span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-warm-200/60 pt-2 font-semibold">
              <span className="text-warm-900">Total deducciones</span>
              <span className="text-warm-900">
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
