'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { formatCurrency } from '@/lib/utils'

interface PagaItem {
  id?: string
  persona: string
  monto: number
}

interface Trabajador {
  id: string
  nombre: string
}

interface CierreDiaFormProps {
  jornadaId: string
  efectivoTotal: number
  montoAlcancia: number
  valorAdicional: number
  pagasExistentes: PagaItem[]
  trabajadores: Trabajador[]
  isAdmin: boolean
  isCerrada: boolean
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
    </svg>
  )
}

export function CierreDiaForm({
  jornadaId,
  efectivoTotal,
  montoAlcancia: montoAlcanciaInicial,
  valorAdicional: valorAdicionalInicial,
  pagasExistentes,
  trabajadores,
  isAdmin,
  isCerrada,
}: CierreDiaFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [valorAdicional, setValorAdicional] = useState(
    valorAdicionalInicial > 0 ? valorAdicionalInicial.toString() : '',
  )
  const [alcancia, setAlcancia] = useState(
    montoAlcanciaInicial > 0 ? montoAlcanciaInicial.toString() : '',
  )
  const [pagas, setPagas] = useState<PagaItem[]>(pagasExistentes)
  const [nuevaPersona, setNuevaPersona] = useState('')
  const [nuevaMonto, setNuevaMonto] = useState('')

  const valorAdicionalNum = parseFloat(valorAdicional) || 0
  const alcanciaNum = parseFloat(alcancia) || 0
  const totalPagas = pagas.reduce((sum, p) => sum + p.monto, 0)
  const efectivoConAdicional = efectivoTotal + valorAdicionalNum
  const saldoDia = efectivoConAdicional - alcanciaNum - totalPagas

  const opcionesTrabajadores = [...trabajadores.map((t) => t.nombre), 'Señora']

  function handleAgregarPaga() {
    if (!nuevaPersona || !nuevaMonto) return
    const monto = parseFloat(nuevaMonto)
    if (isNaN(monto) || monto <= 0) return

    setPagas((prev) => [...prev, { persona: nuevaPersona, monto }])
    setNuevaPersona('')
    setNuevaMonto('')
  }

  function handleEliminarPaga(index: number) {
    setPagas((prev) => prev.filter((_, i) => i !== index))
  }

  async function saveJornadaData(closeJornada: boolean) {
    if (!isAdmin || isCerrada) return

    setLoading(true)
    setError('')

    const updatePayload: Record<string, unknown> = {
      monto_alcancia: alcanciaNum,
      valor_adicional: valorAdicionalNum,
    }
    if (closeJornada) {
      updatePayload.estado = 'cerrada'
    }

    const { error: jornadaError } = await supabase
      .from('jornadas')
      .update(updatePayload)
      .eq('id', jornadaId)

    if (jornadaError) {
      setError(jornadaError.message)
      setLoading(false)
      return
    }

    await supabase.from('pagas').delete().eq('jornada_id', jornadaId)

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
    toast(closeJornada ? 'Jornada cerrada' : 'Datos guardados')
    router.refresh()
  }

  async function handleCerrar() {
    const ok = await confirm({
      title: 'Cerrar jornada',
      message: '¿Estas seguro de cerrar la jornada del dia? Esta accion no se puede deshacer.',
      confirmLabel: 'Cerrar jornada',
      variant: 'danger',
    })
    if (!ok) return
    await saveJornadaData(true)
  }

  async function handleGuardar() {
    await saveJornadaData(false)
  }

  if (!isAdmin) return null

  return (
    <div className="flex flex-col gap-4">
      {/* Valor adicional */}
      <div className="rounded-2xl bg-[#fffcf8] p-4 shadow-card border border-warm-200/60">
        <h3 className="mb-1 font-semibold text-warm-900">Valor adicional</h3>
        <p className="mb-3 text-xs text-warm-400">
          Suma un monto extra al total de venta (ej: ventas adicionales fuera de bandejas)
        </p>
        <Input
          id="valor-adicional"
          type="number"
          min="0"
          step="0.01"
          value={valorAdicional}
          onChange={(e) => setValorAdicional(e.target.value)}
          placeholder="0.00"
          inputMode="decimal"
          label="Monto adicional ($)"
          disabled={isCerrada}
        />
      </div>

      {/* Alcancia */}
      <div className="rounded-2xl bg-[#fffcf8] p-4 shadow-card border border-warm-200/60">
        <h3 className="mb-3 font-semibold text-warm-900">Alcancia</h3>
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
      <div className="rounded-2xl bg-[#fffcf8] p-4 shadow-card border border-warm-200/60">
        <h3 className="mb-3 font-semibold text-warm-900">Pagas de trabajadores</h3>

        {pagas.length > 0 && (
          <div className="mb-3 flex flex-col gap-2">
            {pagas.map((paga, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-xl bg-warm-50/80 px-3 py-2.5"
              >
                <span className="text-sm font-medium text-warm-800">{paga.persona}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-warm-900">
                    {formatCurrency(paga.monto)}
                  </span>
                  {!isCerrada && (
                    <button
                      onClick={() => handleEliminarPaga(index)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-warm-400 transition-all hover:bg-red-50 hover:text-red-500 active:scale-90"
                      aria-label="Eliminar paga"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isCerrada && (
          <div className="flex gap-2">
            <select
              value={nuevaPersona}
              onChange={(e) => setNuevaPersona(e.target.value)}
              className="flex-1 rounded-xl border border-warm-200 bg-warm-50/60 px-3 py-2.5 text-sm text-warm-900 outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="">Seleccionar...</option>
              {opcionesTrabajadores.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </select>
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
      <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 p-4 ring-1 ring-inset ring-orange-200/60">
        <h3 className="mb-3 font-semibold text-warm-900">Cierre del dia</h3>
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-warm-500">Efectivo total</span>
            <span className="font-medium text-warm-900">{formatCurrency(efectivoTotal)}</span>
          </div>
          {valorAdicionalNum > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>(+) Valor adicional</span>
              <span>+{formatCurrency(valorAdicionalNum)}</span>
            </div>
          )}
          <div className="flex justify-between text-blue-600">
            <span>(-) Alcancia</span>
            <span>-{formatCurrency(alcanciaNum)}</span>
          </div>
          {totalPagas > 0 && (
            <div className="flex justify-between text-violet-600">
              <span>(-) Pagas</span>
              <span>-{formatCurrency(totalPagas)}</span>
            </div>
          )}
          <div className="mt-1.5 flex justify-between rounded-xl bg-white/70 px-3 py-2 text-base font-bold border-t border-orange-200/60">
            <span className="text-warm-900">Saldo del dia</span>
            <span className={saldoDia >= 0 ? 'text-emerald-600' : 'text-red-600'}>
              {formatCurrency(saldoDia)}
            </span>
          </div>
        </div>
      </div>

      <ErrorAlert message={error} />

      {!isCerrada && (
        <div className="flex flex-col gap-2">
          <Button onClick={handleGuardar} loading={loading} size="lg" variant="secondary">
            Guardar sin cerrar
          </Button>
          <Button onClick={handleCerrar} loading={loading} size="lg">
            Cerrar jornada del dia
          </Button>
        </div>
      )}

      {isCerrada && (
        <p className="text-center text-sm font-semibold text-emerald-600">
          Jornada cerrada
        </p>
      )}
    </div>
  )
}
