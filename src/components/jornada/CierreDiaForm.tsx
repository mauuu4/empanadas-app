'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, useToast, useConfirm } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

interface PagaItem {
  id?: string
  persona: string
  monto: number
}

interface CierreDiaFormProps {
  jornadaId: string
  efectivoTotal: number
  montoAlcancia: number
  pagasExistentes: PagaItem[]
  isAdmin: boolean
  isCerrada: boolean
}

export function CierreDiaForm({
  jornadaId,
  efectivoTotal,
  montoAlcancia: montoAlcanciaInicial,
  pagasExistentes,
  isAdmin,
  isCerrada,
}: CierreDiaFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [alcancia, setAlcancia] = useState(
    montoAlcanciaInicial > 0 ? montoAlcanciaInicial.toString() : '',
  )
  const [pagas, setPagas] = useState<PagaItem[]>(
    pagasExistentes.length > 0 ? pagasExistentes : [],
  )
  const [nuevaPersona, setNuevaPersona] = useState('')
  const [nuevaMonto, setNuevaMonto] = useState('')

  const alcanciaNum = parseFloat(alcancia) || 0
  const totalPagas = pagas.reduce((sum, p) => sum + p.monto, 0)
  const saldoDia = efectivoTotal - alcanciaNum - totalPagas

  function handleAgregarPaga() {
    if (!nuevaPersona.trim() || !nuevaMonto) return
    const monto = parseFloat(nuevaMonto)
    if (isNaN(monto) || monto <= 0) return

    setPagas((prev) => [...prev, { persona: nuevaPersona.trim(), monto }])
    setNuevaPersona('')
    setNuevaMonto('')
  }

  function handleEliminarPaga(index: number) {
    setPagas((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleCerrar() {
    if (!isAdmin || isCerrada) return

    const ok = await confirm({
      title: 'Cerrar jornada',
      message:
        '¿Estas seguro de cerrar la jornada del dia? Esta accion no se puede deshacer.',
      confirmLabel: 'Cerrar jornada',
      variant: 'danger',
    })
    if (!ok) return

    setLoading(true)
    setError('')

    // Actualizar alcancia en la jornada
    const { error: jornadaError } = await supabase
      .from('jornadas')
      .update({
        monto_alcancia: alcanciaNum,
        estado: 'cerrada',
      })
      .eq('id', jornadaId)

    if (jornadaError) {
      setError(jornadaError.message)
      setLoading(false)
      return
    }

    // Eliminar pagas existentes
    await supabase.from('pagas').delete().eq('jornada_id', jornadaId)

    // Insertar nuevas pagas
    if (pagas.length > 0) {
      const { error: pagasError } = await supabase.from('pagas').insert(
        pagas.map((p) => ({
          jornada_id: jornadaId,
          persona: p.persona,
          monto: p.monto,
        })),
      )

      if (pagasError) {
        setError(pagasError.message)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    toast('Jornada cerrada')
    router.refresh()
  }

  if (!isAdmin) return null

  return (
    <div className="flex flex-col gap-4">
      {/* Alcancia */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-medium text-gray-900">Alcancia</h3>
        <Input
          id="alcancia"
          type="number"
          min="0"
          step="0.01"
          value={alcancia}
          onChange={(e) => setAlcancia(e.target.value)}
          placeholder="0.00"
          inputMode="decimal"
          label="Monto a ahorrar ($)"
          disabled={isCerrada}
        />
      </div>

      {/* Pagas */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-medium text-gray-900">
          Pagas de trabajadores
        </h3>

        {pagas.length > 0 && (
          <div className="mb-3 flex flex-col gap-2">
            {pagas.map((paga, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
              >
                <span className="text-sm text-gray-700">{paga.persona}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {formatCurrency(paga.monto)}
                  </span>
                  {!isCerrada && (
                    <button
                      onClick={() => handleEliminarPaga(index)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
                      aria-label="Eliminar paga"
                    >
                      X
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isCerrada && (
          <div className="flex gap-2">
            <Input
              value={nuevaPersona}
              onChange={(e) => setNuevaPersona(e.target.value)}
              placeholder="Nombre"
              className="flex-1"
            />
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={nuevaMonto}
              onChange={(e) => setNuevaMonto(e.target.value)}
              placeholder="$"
              inputMode="decimal"
              className="w-24"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleAgregarPaga}
            >
              +
            </Button>
          </div>
        )}
      </div>

      {/* Calculo final */}
      <div className="rounded-xl bg-orange-50 p-4">
        <h3 className="mb-3 font-semibold text-gray-900">Cierre del dia</h3>
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Efectivo total</span>
            <span className="font-medium">{formatCurrency(efectivoTotal)}</span>
          </div>
          <div className="flex justify-between text-blue-600">
            <span>(-) Alcancia</span>
            <span>-{formatCurrency(alcanciaNum)}</span>
          </div>
          {totalPagas > 0 && (
            <div className="flex justify-between text-purple-600">
              <span>(-) Pagas</span>
              <span>-{formatCurrency(totalPagas)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-orange-200 pt-2 text-base font-bold">
            <span>Saldo del dia</span>
            <span className={saldoDia >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(saldoDia)}
            </span>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {!isCerrada && (
        <Button onClick={handleCerrar} loading={loading} size="lg">
          Cerrar jornada del dia
        </Button>
      )}

      {isCerrada && (
        <p className="text-center text-sm font-medium text-green-600">
          Jornada cerrada
        </p>
      )}
    </div>
  )
}
