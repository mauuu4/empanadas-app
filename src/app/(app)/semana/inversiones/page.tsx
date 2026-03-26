import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDateShort } from '@/lib/utils'
import { Card, CardContent, CardTitle } from '@/components/ui'
import { InversionesForm } from '@/components/semana/InversionesForm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function InversionesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const vendedorId = user.user_metadata.vendedor_id as string

  const { data: vendedor } = await supabase
    .from('vendedores')
    .select('rol')
    .eq('id', vendedorId)
    .single()

  const isAdmin = vendedor?.rol === 'admin'

  // Buscar semana actual (abierta)
  const { data: semana } = await supabase
    .from('semanas')
    .select('*')
    .order('fecha_inicio', { ascending: false })
    .limit(1)
    .single()

  if (!semana) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <p className="text-gray-500">No hay semana activa.</p>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          &larr; Volver al inicio
        </Link>
      </div>
    )
  }

  const isCerrada = semana.estado === 'cerrada'

  // Buscar inversiones
  const { data: inversiones } = await supabase
    .from('inversiones')
    .select('*')
    .eq('semana_id', semana.id)
    .order('fecha', { ascending: true })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Inversiones y gastos
          </h1>
          <p className="text-sm text-gray-500">
            Semana {formatDateShort(semana.fecha_inicio)} al{' '}
            {formatDateShort(semana.fecha_fin)}
          </p>
        </div>
        <Link
          href="/semana"
          className="text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          &larr; Volver
        </Link>
      </div>

      <Card>
        <CardTitle>
          {isAdmin && !isCerrada
            ? 'Gestionar inversiones'
            : 'Inversiones registradas'}
        </CardTitle>
        <CardContent className="mt-2">
          <InversionesForm
            semanaId={semana.id}
            inversiones={(inversiones ?? []).map((i) => ({
              id: i.id,
              fecha: i.fecha,
              descripcion: i.descripcion,
              monto: i.monto,
              tipo: i.tipo as 'inversion' | 'gasto_personal',
            }))}
            isAdmin={isAdmin}
            isCerrada={isCerrada}
          />
        </CardContent>
      </Card>
    </div>
  )
}
