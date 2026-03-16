export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      vendedores: {
        Row: {
          id: string
          nombre: string
          pin: string
          rol: 'admin' | 'vendedor'
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          pin: string
          rol: 'admin' | 'vendedor'
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          pin?: string
          rol?: 'admin' | 'vendedor'
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      productos: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          unidades_por_bandeja: number
          precio: number
          activo: boolean
          orden: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          unidades_por_bandeja: number
          precio: number
          activo?: boolean
          orden?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          unidades_por_bandeja?: number
          precio?: number
          activo?: boolean
          orden?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      semanas: {
        Row: {
          id: string
          fecha_inicio: string
          fecha_fin: string
          saldo_inicial: number
          estado: 'abierta' | 'cerrada'
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          fecha_inicio: string
          fecha_fin: string
          saldo_inicial?: number
          estado?: 'abierta' | 'cerrada'
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          fecha_inicio?: string
          fecha_fin?: string
          saldo_inicial?: number
          estado?: 'abierta' | 'cerrada'
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      jornadas: {
        Row: {
          id: string
          semana_id: string
          fecha: string
          estado: 'abierta' | 'cerrada'
          monto_alcancia: number
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          semana_id: string
          fecha: string
          estado?: 'abierta' | 'cerrada'
          monto_alcancia?: number
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          semana_id?: string
          fecha?: string
          estado?: 'abierta' | 'cerrada'
          monto_alcancia?: number
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'jornadas_semana_id_fkey'
            columns: ['semana_id']
            isOneToOne: false
            referencedRelation: 'semanas'
            referencedColumns: ['id']
          },
        ]
      }
      asignaciones: {
        Row: {
          id: string
          jornada_id: string
          vendedor_id: string
          producto_id: string
          cantidad_inicial: number
          cantidad_sobrante: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          jornada_id: string
          vendedor_id: string
          producto_id: string
          cantidad_inicial: number
          cantidad_sobrante?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          jornada_id?: string
          vendedor_id?: string
          producto_id?: string
          cantidad_inicial?: number
          cantidad_sobrante?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'asignaciones_jornada_id_fkey'
            columns: ['jornada_id']
            isOneToOne: false
            referencedRelation: 'jornadas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'asignaciones_vendedor_id_fkey'
            columns: ['vendedor_id']
            isOneToOne: false
            referencedRelation: 'vendedores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'asignaciones_producto_id_fkey'
            columns: ['producto_id']
            isOneToOne: false
            referencedRelation: 'productos'
            referencedColumns: ['id']
          },
        ]
      }
      gastos: {
        Row: {
          id: string
          jornada_id: string
          vendedor_id: string
          descripcion: string
          monto: number
          created_at: string
        }
        Insert: {
          id?: string
          jornada_id: string
          vendedor_id: string
          descripcion: string
          monto: number
          created_at?: string
        }
        Update: {
          id?: string
          jornada_id?: string
          vendedor_id?: string
          descripcion?: string
          monto?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'gastos_jornada_id_fkey'
            columns: ['jornada_id']
            isOneToOne: false
            referencedRelation: 'jornadas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'gastos_vendedor_id_fkey'
            columns: ['vendedor_id']
            isOneToOne: false
            referencedRelation: 'vendedores'
            referencedColumns: ['id']
          },
        ]
      }
      transferencias: {
        Row: {
          id: string
          jornada_id: string
          vendedor_id: string
          monto: number
          descripcion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          jornada_id: string
          vendedor_id: string
          monto: number
          descripcion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          jornada_id?: string
          vendedor_id?: string
          monto?: number
          descripcion?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transferencias_jornada_id_fkey'
            columns: ['jornada_id']
            isOneToOne: false
            referencedRelation: 'jornadas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transferencias_vendedor_id_fkey'
            columns: ['vendedor_id']
            isOneToOne: false
            referencedRelation: 'vendedores'
            referencedColumns: ['id']
          },
        ]
      }
      descuentos: {
        Row: {
          id: string
          jornada_id: string
          vendedor_id: string
          monto: number
          descripcion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          jornada_id: string
          vendedor_id: string
          monto: number
          descripcion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          jornada_id?: string
          vendedor_id?: string
          monto?: number
          descripcion?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'descuentos_jornada_id_fkey'
            columns: ['jornada_id']
            isOneToOne: false
            referencedRelation: 'jornadas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'descuentos_vendedor_id_fkey'
            columns: ['vendedor_id']
            isOneToOne: false
            referencedRelation: 'vendedores'
            referencedColumns: ['id']
          },
        ]
      }
      pagas: {
        Row: {
          id: string
          jornada_id: string
          persona: string
          monto: number
          created_at: string
        }
        Insert: {
          id?: string
          jornada_id: string
          persona: string
          monto: number
          created_at?: string
        }
        Update: {
          id?: string
          jornada_id?: string
          persona?: string
          monto?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pagas_jornada_id_fkey'
            columns: ['jornada_id']
            isOneToOne: false
            referencedRelation: 'jornadas'
            referencedColumns: ['id']
          },
        ]
      }
      inversiones: {
        Row: {
          id: string
          semana_id: string
          fecha: string
          descripcion: string
          monto: number
          tipo: 'inversion' | 'gasto_personal'
          created_at: string
        }
        Insert: {
          id?: string
          semana_id: string
          fecha: string
          descripcion: string
          monto: number
          tipo: 'inversion' | 'gasto_personal'
          created_at?: string
        }
        Update: {
          id?: string
          semana_id?: string
          fecha?: string
          descripcion?: string
          monto?: number
          tipo?: 'inversion' | 'gasto_personal'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'inversiones_semana_id_fkey'
            columns: ['semana_id']
            isOneToOne: false
            referencedRelation: 'semanas'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calcular_venta_vendedor: {
        Args: {
          p_jornada_id: string
          p_vendedor_id: string
        }
        Returns: {
          venta_bruta: number
          total_gastos: number
          total_transferencias: number
          total_descuentos: number
          efectivo_a_entregar: number
        }[]
      }
      calcular_consolidado_dia: {
        Args: {
          p_jornada_id: string
        }
        Returns: {
          venta_total: number
          total_gastos: number
          total_transferencias: number
          total_descuentos: number
          efectivo_total: number
          monto_alcancia: number
          total_pagas: number
          saldo_dia: number
        }[]
      }
      calcular_saldo_semanal: {
        Args: {
          p_semana_id: string
        }
        Returns: {
          saldo_inicial: number
          total_saldos_diarios: number
          total_inversiones: number
          total_gastos_personales: number
          saldo_actual: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
