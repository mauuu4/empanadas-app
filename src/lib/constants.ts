/**
 * Dominio para emails internos de autenticacion
 */
export const AUTH_EMAIL_DOMAIN = 'empanadas.local'

/**
 * Duracion de la sesion en segundos (24 horas)
 */
export const SESSION_DURATION = 60 * 60 * 24

/**
 * Longitud del PIN de autenticacion
 */
export const PIN_LENGTH = 4

/**
 * Nombre de la app
 */
export const APP_NAME = 'Empanadas App'

/**
 * Descripcion de la app
 */
export const APP_DESCRIPTION = 'Sistema de ventas diarias para negocio familiar'

/**
 * Dias de la semana del negocio (viernes a jueves)
 */
export const DIAS_SEMANA = [
  'viernes',
  'sabado',
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
] as const

/**
 * Categorias de gasto (solo aplican a gastos, no a transferencias/descuentos).
 * El emoji se usa como icono ligero en selects y chips.
 */
export const GASTO_CATEGORIAS = [
  { value: 'comida', label: 'Comida', emoji: '🍽️' },
  { value: 'transporte', label: 'Transporte', emoji: '⛽' },
  { value: 'insumos', label: 'Insumos', emoji: '🧺' },
  { value: 'casa', label: 'Casa', emoji: '🏠' },
  { value: 'personal', label: 'Personal', emoji: '👤' },
  { value: 'otro', label: 'Otro', emoji: '📌' },
] as const

export type GastoCategoria = (typeof GASTO_CATEGORIAS)[number]['value']

/** Mapa value -> { label, emoji } para lookups O(1) en listas. */
export const GASTO_CATEGORIA_MAP: Record<
  GastoCategoria,
  { label: string; emoji: string }
> = Object.fromEntries(
  GASTO_CATEGORIAS.map((c) => [c.value, { label: c.label, emoji: c.emoji }]),
) as Record<GastoCategoria, { label: string; emoji: string }>
