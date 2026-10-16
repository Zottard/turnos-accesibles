// Tipos de la base de Supabase. Los usa useSupabaseClient() para autocompletar tablas y columnas.
// Generados con `supabase gen types typescript` (o el MCP de Supabase) y recortados a lo que usamos.
// Si cambia una migración, hay que volver a generarlos.
// Único cambio a mano: las funciones de bloqueo pueden devolver null (Postgres no lo informa).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      intentos_ingreso: {
        Row: {
          bloqueado_hasta: string | null
          correo: string
          fallidos: number
        }
        Insert: {
          bloqueado_hasta?: string | null
          correo: string
          fallidos?: number
        }
        Update: {
          bloqueado_hasta?: string | null
          correo?: string
          fallidos?: number
        }
        Relationships: []
      }
      perfiles: {
        Row: {
          apellido: string
          creado_en: string
          dni: string | null
          fecha_nacimiento: string | null
          id: string
          localidad: string | null
          nombre: string
          rol: string
          telefono: string | null
        }
        Insert: {
          apellido?: string
          creado_en?: string
          dni?: string | null
          fecha_nacimiento?: string | null
          id: string
          localidad?: string | null
          nombre?: string
          rol?: string
          telefono?: string | null
        }
        Update: {
          apellido?: string
          creado_en?: string
          dni?: string | null
          fecha_nacimiento?: string | null
          id?: string
          localidad?: string | null
          nombre?: string
          rol?: string
          telefono?: string | null
        }
        Relationships: []
      }
      preferencias: {
        Row: {
          actualizado_en: string
          alto_contraste: boolean
          antelacion_horas: number
          canal_aviso: string
          lectura_voz: boolean
          lenguaje_simple: boolean
          reducir_movimiento: boolean
          tamano_texto: number
          usuario_id: string
          velocidad_voz: number
        }
        Insert: {
          actualizado_en?: string
          alto_contraste?: boolean
          antelacion_horas?: number
          canal_aviso?: string
          lectura_voz?: boolean
          lenguaje_simple?: boolean
          reducir_movimiento?: boolean
          tamano_texto?: number
          usuario_id: string
          velocidad_voz?: number
        }
        Update: {
          actualizado_en?: string
          alto_contraste?: boolean
          antelacion_horas?: number
          canal_aviso?: string
          lectura_voz?: boolean
          lenguaje_simple?: boolean
          reducir_movimiento?: boolean
          tamano_texto?: number
          usuario_id?: string
          velocidad_voz?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      estado_bloqueo: { Args: { p_correo: string }; Returns: string | null }
      limpiar_intentos: { Args: never; Returns: undefined }
      registrar_fallo: { Args: { p_correo: string }; Returns: string | null }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
