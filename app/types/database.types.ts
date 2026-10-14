// Tipos de la base de Supabase. Los usa useSupabaseClient() para autocompletar tablas y columnas.
// Generados con `supabase gen types typescript` (o el MCP de Supabase) y recortados a lo que usamos.
// Si cambia una migración, hay que volver a generarlos.
// Cambios a mano (Postgres no informa qué puede ser null en lo que devuelve una función):
// - las funciones de bloqueo pueden devolver null;
// - en buscar_turnos, distancia_km (sin ubicación) y requisitos pueden ser null.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      avisos_disponibilidad: {
        Row: {
          creado_en: string
          especialidad_id: number
          id: number
          localidad: string | null
          usuario_id: string
        }
        Insert: {
          creado_en?: string
          especialidad_id: number
          id?: never
          localidad?: string | null
          usuario_id?: string
        }
        Update: {
          creado_en?: string
          especialidad_id?: number
          id?: never
          localidad?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'avisos_disponibilidad_especialidad_id_fkey'
            columns: ['especialidad_id']
            isOneToOne: false
            referencedRelation: 'especialidades'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'avisos_disponibilidad_localidad_fkey'
            columns: ['localidad']
            isOneToOne: false
            referencedRelation: 'localidades'
            referencedColumns: ['nombre']
          },
        ]
      }
      centros: {
        Row: {
          accesibilidad: string | null
          activo: boolean
          direccion: string
          horario: string | null
          id: number
          lat: number
          lng: number
          localidad: string
          nombre: string
          telefono: string | null
          tipo: string
        }
        Insert: {
          accesibilidad?: string | null
          activo?: boolean
          direccion: string
          horario?: string | null
          id?: never
          lat: number
          lng: number
          localidad: string
          nombre: string
          telefono?: string | null
          tipo: string
        }
        Update: {
          accesibilidad?: string | null
          activo?: boolean
          direccion?: string
          horario?: string | null
          id?: never
          lat?: number
          lng?: number
          localidad?: string
          nombre?: string
          telefono?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: 'centros_localidad_fkey'
            columns: ['localidad']
            isOneToOne: false
            referencedRelation: 'localidades'
            referencedColumns: ['nombre']
          },
        ]
      }
      especialidades: {
        Row: {
          activa: boolean
          descripcion: string
          id: number
          nombre: string
          nombre_simple: string
          palabras_clave: string[]
        }
        Insert: {
          activa?: boolean
          descripcion: string
          id?: never
          nombre: string
          nombre_simple: string
          palabras_clave?: string[]
        }
        Update: {
          activa?: boolean
          descripcion?: string
          id?: never
          nombre?: string
          nombre_simple?: string
          palabras_clave?: string[]
        }
        Relationships: []
      }
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
      localidades: {
        Row: {
          lat: number
          lng: number
          nombre: string
        }
        Insert: {
          lat: number
          lng: number
          nombre: string
        }
        Update: {
          lat?: number
          lng?: number
          nombre?: string
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
      profesionales: {
        Row: {
          centro_id: number
          especialidad_id: number
          id: number
          nombre: string
        }
        Insert: {
          centro_id: number
          especialidad_id: number
          id?: never
          nombre: string
        }
        Update: {
          centro_id?: number
          especialidad_id?: number
          id?: never
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profesionales_centro_id_fkey'
            columns: ['centro_id']
            isOneToOne: false
            referencedRelation: 'centros'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profesionales_especialidad_id_fkey'
            columns: ['especialidad_id']
            isOneToOne: false
            referencedRelation: 'especialidades'
            referencedColumns: ['id']
          },
        ]
      }
      turnos: {
        Row: {
          centro_id: number
          duracion_min: number
          especialidad_id: number
          estado: string
          id: number
          inicio: string
          profesional_id: number
          requisitos: string | null
        }
        Insert: {
          centro_id: number
          duracion_min?: number
          especialidad_id: number
          estado?: string
          id?: never
          inicio: string
          profesional_id: number
          requisitos?: string | null
        }
        Update: {
          centro_id?: number
          duracion_min?: number
          especialidad_id?: number
          estado?: string
          id?: never
          inicio?: string
          profesional_id?: number
          requisitos?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'turnos_centro_id_fkey'
            columns: ['centro_id']
            isOneToOne: false
            referencedRelation: 'centros'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'turnos_especialidad_id_fkey'
            columns: ['especialidad_id']
            isOneToOne: false
            referencedRelation: 'especialidades'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'turnos_profesional_id_fkey'
            columns: ['profesional_id']
            isOneToOne: false
            referencedRelation: 'profesionales'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      buscar_turnos: {
        Args: {
          p_centro_id?: number
          p_desde?: string
          p_especialidad_id: number
          p_franja?: string
          p_hasta?: string
          p_lat?: number
          p_limite?: number
          p_lng?: number
        }
        Returns: {
          centro_direccion: string
          centro_id: number
          centro_localidad: string
          centro_nombre: string
          distancia_km: number | null
          especialidad_nombre: string
          especialidad_nombre_simple: string
          id: number
          inicio: string
          profesional: string
          requisitos: string | null
        }[]
      }
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
