'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, useToast, useConfirm } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

interface CerrarSemanaFormProps {
  semanaId: string
  saldoInicial: number
  totalSaldosDiarios: number
  totalInversiones: number
  totalGastosPersonales: number
  saldoActual: number
  isAdmin: boolean
  isCerrada: boolean
}

export function CerrarSemanaForm({
  semanaId,
  saldoInicial,
  totalSaldosDiarios,
  totalInversiones,
  totalGastosPersonales,
  saldoActual,
  isAdmin,
  isCerrada,
}: CerrarSemanaFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCerrar() {
    if (!isAdmin || isCerrada) return

    const ok = await confirm({
      title: 'Cerrar semana',
      message:
        '¿Estas seguro de cerrar la semana? El saldo final se usara como saldo inicial de la siguiente semana.',
      confirmLabel: 'Cerrar semana',
      variant: 'danger',
    })
    if (!ok) return

    setLoading(true)
    setError('')

    const { error: updateError } = await supabase
      .from('semanas')
      .update({ estado: 'cerrada' })
      .eq('id', semanaId)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    toast('Semana cerrada')
    router.refresh()
  }

  if (!isAdmin) return null

  return (
    <div className="flex flex-col gap-4">
      {/* Resumen del saldo */}
      <div className="rounded-xl bg-orange-50 p-4">
        <h3 className="mb-3 font-semibold text-gray-900">Saldo semanal</h3>
        <div className="flex flex-col gap-1 text-sm">
          {saldoInicial > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Saldo inicial (anterior)</span>
              <span className="font-medium">
                {formatCurrency(saldoInicial)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Total saldos diarios</span>
            <span className="font-medium">
              {formatCurrency(totalSaldosDiarios)}
            </span>
          </div>
          {totalInversiones > 0 && (
            <div className="flex justify-between text-blue-600">
              <span>(-) Inversiones</span>
              <span>-{formatCurrency(totalInversiones)}</span>
            </div>
          )}
          {totalGastosPersonales > 0 && (
            <div className="flex justify-between text-purple-600">
              <span>(-) Gastos personales</span>
              <span>-{formatCurrency(totalGastosPersonales)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-orange-200 pt-2 text-base font-bold">
            <span>Saldo final</span>
            <span
              className={saldoActual >= 0 ? 'text-green-600' : 'text-red-600'}
            >
              {formatCurrency(saldoActual)}
            </span>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {!isCerrada && (
        <Button onClick={handleCerrar} loading={loading} size="lg">
          Cerrar semana
        </Button>
      )}

      {isCerrada && (
        <p className="text-center text-sm font-medium text-green-600">
          Semana cerrada
        </p>
      )}
    </div>
  )
}
