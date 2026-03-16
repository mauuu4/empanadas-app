'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, useToast } from '@/components/ui'
import { today } from '@/lib/utils'

interface CrearJornadaButtonProps {
  semanaId?: string | null
}

export function CrearJornadaButton({ semanaId }: CrearJornadaButtonProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCrear() {
    setLoading(true)
    setError('')

    const fechaHoy = today()

    let currentSemanaId = semanaId

    // Si no hay semana abierta, crear una nueva
    if (!currentSemanaId) {
      // Calcular viernes de esta semana y jueves siguiente
      const now = new Date()
      const dayOfWeek = now.getDay() // 0=dom, 1=lun, ..., 5=vie, 6=sab
      // Encontrar el viernes mas reciente (o hoy si es viernes)
      const daysFromFriday = (dayOfWeek + 2) % 7 // dias desde el viernes anterior
      const viernes = new Date(now)
      viernes.setDate(now.getDate() - daysFromFriday)
      const jueves = new Date(viernes)
      jueves.setDate(viernes.getDate() + 6)

      const fechaInicio = viernes.toISOString().split('T')[0]
      const fechaFin = jueves.toISOString().split('T')[0]

      // Buscar saldo de la semana anterior
      const { data: semanaAnterior } = await supabase
        .from('semanas')
        .select('*')
        .eq('estado', 'cerrada')
        .order('fecha_inicio', { ascending: false })
        .limit(1)
        .single()

      let saldoInicial = 0
      if (semanaAnterior) {
        // Calcular saldo final de la semana anterior
        const { data: saldoData } = await supabase.rpc(
          'calcular_saldo_semanal',
          { p_semana_id: semanaAnterior.id },
        )
        if (saldoData && saldoData.length > 0) {
          saldoInicial = saldoData[0].saldo_actual
        }
      }

      const { data: nuevaSemana, error: semanaError } = await supabase
        .from('semanas')
        .insert({
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          saldo_inicial: saldoInicial,
        })
        .select()
        .single()

      if (semanaError) {
        setError(semanaError.message)
        setLoading(false)
        return
      }

      currentSemanaId = nuevaSemana.id
    }

    // Crear la jornada
    const { error: jornadaError } = await supabase.from('jornadas').insert({
      semana_id: currentSemanaId,
      fecha: fechaHoy,
    })

    if (jornadaError) {
      setError(jornadaError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    toast('Jornada creada')
    router.refresh()
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button onClick={handleCrear} loading={loading} size="lg">
        Crear jornada de hoy
      </Button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
