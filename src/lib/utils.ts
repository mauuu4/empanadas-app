import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatear un numero como moneda (USD)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formatear una fecha en formato legible (espanol)
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  return d.toLocaleDateString('es-EC', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Formatear una fecha con hora (espanol + hora)
 */
export function formatDateWithTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  return d.toLocaleDateString('es-EC', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Guayaquil',
  })
}

/**
 * Formatear una fecha corta (dd/mm/yyyy)
 */
export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  return d.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Obtener la fecha de hoy en formato YYYY-MM-DD (zona horaria Ecuador)
 */
export function today(): string {
  const now = new Date()
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })
}

/**
 * Fecha "activa" de la jornada en zona Ecuador.
 * Antes de las 16:00 → ayer (la jornada anterior sigue siendo la activa).
 * A partir de las 16:00 → hoy (ya empezó la jornada del día calendario).
 */
export function fechaJornadaActiva(): string {
  const now = new Date()
  const fechaHoy = now.toLocaleDateString('en-CA', {
    timeZone: 'America/Guayaquil',
  })
  const horaEc = parseInt(
    now.toLocaleString('en-US', {
      timeZone: 'America/Guayaquil',
      hour: '2-digit',
      hour12: false,
    }),
    10,
  )
  if (horaEc >= 16) return fechaHoy
  const [y, m, d] = fechaHoy.split('-').map(Number)
  const ayer = new Date(Date.UTC(y, m - 1, d))
  ayer.setUTCDate(ayer.getUTCDate() - 1)
  return ayer.toISOString().split('T')[0]
}

/**
 * Normalizar un nombre para usarlo como parte del email interno
 * Ejemplo: "Mauricio Romero" -> "mauricio-romero"
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Generar el email interno para autenticacion con Supabase Auth
 * Ejemplo: "Mauricio Romero" -> "mauricio-romero@empanadas.local"
 */
export function generateInternalEmail(name: string): string {
  return `${normalizeName(name)}@empanadas.local`
}
