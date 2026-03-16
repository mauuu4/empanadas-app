import type { Database } from './database'

// Tipos de filas de cada tabla
export type Vendedor = Database['public']['Tables']['vendedores']['Row']
export type Producto = Database['public']['Tables']['productos']['Row']
export type Semana = Database['public']['Tables']['semanas']['Row']
export type Jornada = Database['public']['Tables']['jornadas']['Row']
export type Asignacion = Database['public']['Tables']['asignaciones']['Row']
export type Gasto = Database['public']['Tables']['gastos']['Row']
export type Transferencia =
  Database['public']['Tables']['transferencias']['Row']
export type Descuento = Database['public']['Tables']['descuentos']['Row']
export type Paga = Database['public']['Tables']['pagas']['Row']
export type Inversion = Database['public']['Tables']['inversiones']['Row']

// Tipos de insercion
export type VendedorInsert =
  Database['public']['Tables']['vendedores']['Insert']
export type ProductoInsert = Database['public']['Tables']['productos']['Insert']
export type SemanaInsert = Database['public']['Tables']['semanas']['Insert']
export type JornadaInsert = Database['public']['Tables']['jornadas']['Insert']
export type AsignacionInsert =
  Database['public']['Tables']['asignaciones']['Insert']
export type GastoInsert = Database['public']['Tables']['gastos']['Insert']
export type TransferenciaInsert =
  Database['public']['Tables']['transferencias']['Insert']
export type DescuentoInsert =
  Database['public']['Tables']['descuentos']['Insert']
export type PagaInsert = Database['public']['Tables']['pagas']['Insert']
export type InversionInsert =
  Database['public']['Tables']['inversiones']['Insert']

// Tipos de actualizacion
export type VendedorUpdate =
  Database['public']['Tables']['vendedores']['Update']
export type ProductoUpdate = Database['public']['Tables']['productos']['Update']

// Tipos de funciones
export type VentaVendedorResult =
  Database['public']['Functions']['calcular_venta_vendedor']['Returns'][number]
export type ConsolidadoDiaResult =
  Database['public']['Functions']['calcular_consolidado_dia']['Returns'][number]
export type SaldoSemanalResult =
  Database['public']['Functions']['calcular_saldo_semanal']['Returns'][number]

// Roles
export type Rol = 'admin' | 'vendedor'
export type EstadoJornada = 'abierta' | 'cerrada'
export type EstadoSemana = 'abierta' | 'cerrada'
export type TipoInversion = 'inversion' | 'gasto_personal'
