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
