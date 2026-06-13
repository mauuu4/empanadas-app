import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// -- Cached Intl formatters (js-cache-function-results) --
// Avoids re-creating the formatter on every call.

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

/**
 * Formatear un numero como moneda (USD)
 */
export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

// -- Date helpers --

/**
 * Parse a date string (YYYY-MM-DD) or Date into a local Date object,
 * avoiding timezone-shift issues by appending T00:00:00 to date-only strings.
 */
export function parseLocalDate(date: string | Date): Date {
  if (date instanceof Date) return date
  return new Date(date + 'T00:00:00')
}

/**
 * Formatear una fecha en formato legible (espanol)
 */
export function formatDate(date: string | Date): string {
  return parseLocalDate(date).toLocaleDateString('es-EC', {
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
  return parseLocalDate(date).toLocaleDateString('es-EC', {
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
  return parseLocalDate(date).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Obtener la fecha de la jornada actual en formato YYYY-MM-DD (zona horaria Ecuador)
 * La jornada empieza a las 15:00 (3 PM) y termina a las 14:59 del dia siguiente.
 */
export function getCurrentJornadaDate(): string {
  const d = getCurrentJornadaLocalDate()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Obtener la fecha "logical" Date object para la jornada actual (zona horaria Ecuador)
 *
 * HACK: Parsing `toLocaleString` back to a Date is a known workaround for
 * server-side timezone conversion without `Temporal` or a timezone library.
 * This works reliably with the `en-US` locale format but is not spec-guaranteed.
 */
export function getCurrentJornadaLocalDate(): Date {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' }))
  if (now.getHours() < 15) {
    now.setDate(now.getDate() - 1)
  }
  return now
}

/**
 * Obtener la fecha de hoy en formato YYYY-MM-DD (zona horaria Ecuador)
 * (Solo usar cuando se requiere la fecha cronologica real)
 */
export function today(): string {
  const now = new Date()
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })
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

/**
 * Build the admin query string (?fecha=...&vendedor=...) for manual jornada navigation.
 * Returns empty string if no admin params are present.
 */
export function buildAdminQuery(params: { fecha?: string; vendedor?: string }): string {
  if (params.fecha && params.vendedor) {
    return `?fecha=${params.fecha}&vendedor=${params.vendedor}`
  }
  return ''
}
