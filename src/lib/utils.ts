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
 * Obtener la fecha de hoy en formato YYYY-MM-DD
 */
export function today(): string {
  return new Date().toISOString().split('T')[0]
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
