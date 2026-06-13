import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Redirige al nuevo flujo: la gestión de jornadas vive en /semana e /historial.
export default function RegistroManualPage() {
  redirect('/semana')
}
