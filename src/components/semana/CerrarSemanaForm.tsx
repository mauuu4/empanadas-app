'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { formatCurrency } from '@/lib/utils'
import { cerrarSemana } from '@/app/(app)/semana/actions'

interface CerrarSemanaFormProps {
  semanaId: string
  saldoInicial: number
  totalSaldosDiarios: number
  totalInversiones: number
  totalGastosGenerales: number
  totalGastosPersonales: number
  saldoActual: number
  fechaFin: string
  jornadas: { fecha: string }[]
  isAdmin: boolean
  isCerrada: boolean
}

export function CerrarSemanaForm({
  semanaId,
  saldoInicial,
  totalSaldosDiarios,
  totalInversiones,
  totalGastosGenerales,
  totalGastosPersonales,
  saldoActual,
  fechaFin,
  jornadas,
  isAdmin,
  isCerrada,
}: CerrarSemanaFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fechaCierre, setFechaCierre] = useState(fechaFin)

  const jornadasFuera = jornadas.filter((j) => j.fecha > fechaCierre)

  async function handleCerrar() {
    if (!isAdmin || isCerrada) return

    const ok = await confirm({
      title: 'Cerrar semana',
      message:
        jornadasFuera.length > 0
          ? `Se cerrará la semana hasta el ${fechaCierre}. ${jornadasFuera.length} jornada(s) posterior(es) pasarán a una semana nueva. El saldo final será el saldo inicial de la siguiente semana.`
          : '¿Estas seguro de cerrar la semana? El saldo final se usará como saldo inicial de la siguiente semana.',
      confirmLabel: 'Cerrar semana',
      variant: 'danger',
    })
    if (!ok) return

    setLoading(true)
    setError('')

    const result = await cerrarSemana(semanaId, fechaCierre)

    if (!result.ok) {
      setError(result.error)
      setLoading(false)
      return
    }

    setLoading(false)
    toast(
      result.movidas > 0
        ? `Semana cerrada · ${result.movidas} jornada(s) movida(s)`
        : 'Semana cerrada',
    )
    router.refresh()
  }

  if (!isAdmin) return null

  return (
    <div className="flex flex-col gap-4">
      {/* Resumen del saldo */}
      <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 p-4 ring-1 ring-inset ring-orange-200/60">
        <h3 className="mb-3 font-semibold text-warm-900">Saldo semanal</h3>
        <div className="flex flex-col gap-1.5 text-sm">
          {saldoInicial > 0 && (
            <div className="flex justify-between">
              <span className="text-warm-500">Saldo inicial (anterior)</span>
              <span className="font-medium text-warm-900">{formatCurrency(saldoInicial)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-warm-500">Total saldos diarios</span>
            <span className="font-medium text-warm-900">{formatCurrency(totalSaldosDiarios)}</span>
          </div>
          {totalInversiones > 0 && (
            <div className="flex justify-between text-blue-600">
              <span>(-) Inversiones</span>
              <span>-{formatCurrency(totalInversiones)}</span>
            </div>
          )}
          {totalGastosGenerales > 0 && (
            <div className="flex justify-between text-amber-600">
              <span>(-) Gastos generales</span>
              <span>-{formatCurrency(totalGastosGenerales)}</span>
            </div>
          )}
          {totalGastosPersonales > 0 && (
            <div className="flex justify-between text-violet-600">
              <span>(-) Gastos personales</span>
              <span>-{formatCurrency(totalGastosPersonales)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-orange-200/60 pt-2 text-base font-bold">
            <span className="text-warm-900">Saldo final</span>
            <span className={saldoActual >= 0 ? 'text-emerald-600' : 'text-red-600'}>
              {formatCurrency(saldoActual)}
            </span>
          </div>
        </div>
      </div>

      {!isCerrada && (
        <div className="rounded-2xl bg-[#fffcf8] p-4 shadow-card border border-warm-200/60">
          <h3 className="mb-1 font-semibold text-warm-900">Cerrar hasta</h3>
          <p className="mb-3 text-xs text-warm-400">
            Indica hasta qué día corresponde esta semana. Las jornadas posteriores se
            moverán a una semana nueva.
          </p>
          <Input
            id="fecha-cierre"
            type="date"
            value={fechaCierre}
            onChange={(e) => setFechaCierre(e.target.value)}
            label="Fecha de fin"
          />
          {jornadasFuera.length > 0 && (
            <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200/60">
              {jornadasFuera.length} jornada(s) posterior(es) a esta fecha pasarán a una
              semana nueva.
            </p>
          )}
        </div>
      )}

      <ErrorAlert message={error} />

      {!isCerrada && (
        <Button onClick={handleCerrar} loading={loading} size="lg">
          Cerrar semana
        </Button>
      )}

      {isCerrada && (
        <p className="text-center text-sm font-semibold text-emerald-600">
          Semana cerrada
        </p>
      )}
    </div>
  )
}
