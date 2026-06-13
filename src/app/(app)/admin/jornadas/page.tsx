import { redirect } from 'next/navigation'

// El hub de jornadas se eliminó: la semana actual se gestiona desde /semana
// (seleccionando la jornada) y las semanas pasadas desde /historial.
export default function AdminJornadasPage() {
  redirect('/semana')
}
