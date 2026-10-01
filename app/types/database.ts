export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      acompanamientos: {
        Row: {
          acompanante_id: string | null
          aceptado_en: string | null
          alcance: string[]
          email_invitado: string
          estado: string
          id: string
          invitado_en: string
          revocado_en: string | null
          solicitante_id: string
          token_invitacion: string
          vence_en: string
        }
        Insert: {
          acompanante_id?: string | null
          aceptado_en?: string | null
          alcance: string[]
          email_invitado: string
          estado?: string
          id?: string
          invitado_en?: string
          revocado_en?: string | null
          solicitante_id: string
          token_invitacion?: string
          vence_en?: string
        }
        Update: {
          acompanante_id?: string | null
          aceptado_en?: string | null
          alcance?: string[]
          email_invitado?: string
          estado?: string
          id?: string
          invitado_en?: string
          revocado_en?: string | null
          solicitante_id?: string
          token_invitacion?: string
          vence_en?: string
        }
        Relationships: []
      }
      agendas: {
        Row: {
          centro_id: string
          cupos_totales: number
          duracion_min: number
          especialidad_id: number
          fecha: string
          hora_fin: string
          hora_inicio: string
          id: string
          profesional_id: string
        }
        Insert: {
          centro_id: string
          cupos_totales: number
          duracion_min: number
          especialidad_id: number
          fecha: string
          hora_fin: string
          hora_inicio: string
          id?: string
          profesional_id: string
        }
        Update: {
          centro_id?: string
          cupos_totales?: number
          duracion_min?: number
          especialidad_id?: number
          fecha?: string
          hora_fin?: string
          hora_inicio?: string
          id?: string
          profesional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendas_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendas_especialidad_id_fkey"
            columns: ["especialidad_id"]
            isOneToOne: false
            referencedRelation: "especialidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendas_profesional_id_fkey"
            columns: ["profesional_id"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria: {
        Row: {
          accion: string
          actor_id: string | null
          antes: Json | null
          creado_en: string
          despues: Json | null
          entidad: string
          entidad_id: string
          id: number
        }
        Insert: {
          accion: string
          actor_id?: string | null
          antes?: Json | null
          creado_en?: string
          despues?: Json | null
          entidad: string
          entidad_id: string
          id?: never
        }
        Update: {
          accion?: string
          actor_id?: string | null
          antes?: Json | null
          creado_en?: string
          despues?: Json | null
          entidad?: string
          entidad_id?: string
          id?: never
        }
        Relationships: []
      }
      centro_especialidad: {
        Row: {
          centro_id: string
          especialidad_id: number
          requisitos: string | null
        }
        Insert: {
          centro_id: string
          especialidad_id: number
          requisitos?: string | null
        }
        Update: {
          centro_id?: string
          especialidad_id?: number
          requisitos?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "centro_especialidad_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centro_especialidad_especialidad_id_fkey"
            columns: ["especialidad_id"]
            isOneToOne: false
            referencedRelation: "especialidades"
            referencedColumns: ["id"]
          },
        ]
      }
      consentimientos: {
        Row: {
          acompanamiento_id: string
          alcance: string[]
          id: string
          ip: string | null
          otorgado_en: string
          revocado_en: string | null
          solicitante_id: string
          user_agent: string | null
        }
        Insert: {
          acompanamiento_id: string
          alcance: string[]
          id?: string
          ip?: string | null
          otorgado_en?: string
          revocado_en?: string | null
          solicitante_id: string
          user_agent?: string | null
        }
        Update: {
          acompanamiento_id?: string
          alcance?: string[]
          id?: string
          ip?: string | null
          otorgado_en?: string
          revocado_en?: string | null
          solicitante_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      centros: {
        Row: {
          accesibilidad_edilicia: Json | null
          activo: boolean
          como_llegar: string | null
          dependencia: string
          direccion: string
          fuente: string | null
          horario_atencion: string | null
          id: string
          instrucciones_turno: string | null
          lat: number
          lng: number
          localidad: string
          modo_turnos: Database["public"]["Enums"]["modo_turnos"]
          nombre: string
          partido: string
          provincia: string
          refes_id: string | null
          telefono: string | null
          telefono_turnos: string | null
          tipo: Database["public"]["Enums"]["tipo_centro"]
          web_turnos: string | null
        }
        Insert: {
          accesibilidad_edilicia?: Json | null
          activo?: boolean
          como_llegar?: string | null
          dependencia: string
          direccion: string
          fuente?: string | null
          horario_atencion?: string | null
          id?: string
          instrucciones_turno?: string | null
          lat: number
          lng: number
          localidad: string
          modo_turnos?: Database["public"]["Enums"]["modo_turnos"]
          nombre: string
          partido: string
          provincia?: string
          refes_id?: string | null
          telefono?: string | null
          telefono_turnos?: string | null
          tipo: Database["public"]["Enums"]["tipo_centro"]
          web_turnos?: string | null
        }
        Update: {
          accesibilidad_edilicia?: Json | null
          activo?: boolean
          como_llegar?: string | null
          dependencia?: string
          direccion?: string
          fuente?: string | null
          horario_atencion?: string | null
          id?: string
          instrucciones_turno?: string | null
          lat?: number
          lng?: number
          localidad?: string
          modo_turnos?: Database["public"]["Enums"]["modo_turnos"]
          nombre?: string
          partido?: string
          provincia?: string
          refes_id?: string | null
          telefono?: string | null
          telefono_turnos?: string | null
          tipo?: Database["public"]["Enums"]["tipo_centro"]
          web_turnos?: string | null
        }
        Relationships: []
      }
      especialidades: {
        Row: {
          activo: boolean
          descripcion_simple: string
          icono: string
          id: number
          nombre_comun: string
          nombre_tecnico: string
          slug: string
        }
        Insert: {
          activo?: boolean
          descripcion_simple: string
          icono: string
          id?: never
          nombre_comun: string
          nombre_tecnico: string
          slug: string
        }
        Update: {
          activo?: boolean
          descripcion_simple?: string
          icono?: string
          id?: never
          nombre_comun?: string
          nombre_tecnico?: string
          slug?: string
        }
        Relationships: []
      }
      intentos_login: {
        Row: {
          bloqueado_hasta: string | null
          email: string
          fallos: number
          ultimo_fallo: string | null
        }
        Insert: {
          bloqueado_hasta?: string | null
          email: string
          fallos?: number
          ultimo_fallo?: string | null
        }
        Update: {
          bloqueado_hasta?: string | null
          email?: string
          fallos?: number
          ultimo_fallo?: string | null
        }
        Relationships: []
      }
      localidades: {
        Row: {
          id: number
          lat: number
          lng: number
          nombre: string
          partido: string
        }
        Insert: {
          id?: never
          lat: number
          lng: number
          nombre: string
          partido: string
        }
        Update: {
          id?: never
          lat?: number
          lng?: number
          nombre?: string
          partido?: string
        }
        Relationships: []
      }
      notificaciones: {
        Row: {
          canal: string
          correo_enviado_en: string | null
          creado_en: string
          cuerpo: string
          enviada_en: string | null
          error: string | null
          estado: string
          id: string
          leida_en: string | null
          profile_id: string
          programada_para: string
          reserva_id: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          canal?: string
          correo_enviado_en?: string | null
          creado_en?: string
          cuerpo: string
          enviada_en?: string | null
          error?: string | null
          estado?: string
          id?: string
          leida_en?: string | null
          profile_id: string
          programada_para?: string
          reserva_id?: string | null
          tipo: string
          titulo: string
        }
        Update: {
          canal?: string
          correo_enviado_en?: string | null
          creado_en?: string
          cuerpo?: string
          enviada_en?: string | null
          error?: string | null
          estado?: string
          id?: string
          leida_en?: string | null
          profile_id?: string
          programada_para?: string
          reserva_id?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      preferencias_accesibilidad: {
        Row: {
          actualizado_en: string
          avisos_por_correo: boolean
          canal_notificacion: string
          contraste: string
          id: string
          lenguaje_simple: boolean
          profile_id: string
          reduce_motion: string
          text_scale: string
          voz_activa: boolean
          voz_velocidad: string
        }
        Insert: {
          actualizado_en?: string
          avisos_por_correo?: boolean
          canal_notificacion?: string
          contraste?: string
          id?: string
          lenguaje_simple?: boolean
          profile_id: string
          reduce_motion?: string
          text_scale?: string
          voz_activa?: boolean
          voz_velocidad?: string
        }
        Update: {
          actualizado_en?: string
          avisos_por_correo?: boolean
          canal_notificacion?: string
          contraste?: string
          id?: string
          lenguaje_simple?: boolean
          profile_id?: string
          reduce_motion?: string
          text_scale?: string
          voz_activa?: boolean
          voz_velocidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "preferencias_accesibilidad_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profesionales: {
        Row: {
          apellido: string
          especialidad_id: number
          id: string
          matricula: string
          nombre: string
        }
        Insert: {
          apellido: string
          especialidad_id: number
          id?: string
          matricula: string
          nombre: string
        }
        Update: {
          apellido?: string
          especialidad_id?: number
          id?: string
          matricula?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "profesionales_especialidad_id_fkey"
            columns: ["especialidad_id"]
            isOneToOne: false
            referencedRelation: "especialidades"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          apellido: string
          creado_en: string
          documento: string
          fecha_nacimiento: string | null
          id: string
          lat: number | null
          lng: number | null
          localidad: string | null
          nombre: string
          rol: Database["public"]["Enums"]["rol"]
          telefono: string | null
        }
        Insert: {
          apellido: string
          creado_en?: string
          documento: string
          fecha_nacimiento?: string | null
          id: string
          lat?: number | null
          lng?: number | null
          localidad?: string | null
          nombre: string
          rol?: Database["public"]["Enums"]["rol"]
          telefono?: string | null
        }
        Update: {
          apellido?: string
          creado_en?: string
          documento?: string
          fecha_nacimiento?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          localidad?: string | null
          nombre?: string
          rol?: Database["public"]["Enums"]["rol"]
          telefono?: string | null
        }
        Relationships: []
      }
      reservas: {
        Row: {
          cancelada_en: string | null
          creada_en: string
          estado: Database["public"]["Enums"]["estado_reserva"]
          id: string
          motivo_cancelacion: string | null
          numero_correlativo: number
          reserva_origen_id: string | null
          reservada_por_id: string
          solicitante_id: string
          turno_id: string
        }
        Insert: {
          cancelada_en?: string | null
          creada_en?: string
          estado?: Database["public"]["Enums"]["estado_reserva"]
          id?: string
          motivo_cancelacion?: string | null
          numero_correlativo?: never
          reserva_origen_id?: string | null
          reservada_por_id: string
          solicitante_id: string
          turno_id: string
        }
        Update: {
          cancelada_en?: string | null
          creada_en?: string
          estado?: Database["public"]["Enums"]["estado_reserva"]
          id?: string
          motivo_cancelacion?: string | null
          numero_correlativo?: never
          reserva_origen_id?: string | null
          reservada_por_id?: string
          solicitante_id?: string
          turno_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservas_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "turnos_disponibles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_reservada_por_id_fkey"
            columns: ["reservada_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_reserva_origen_id_fkey"
            columns: ["reserva_origen_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      turnos_disponibles: {
        Row: {
          agenda_id: string
          centro_id: string
          especialidad_id: number
          estado: Database["public"]["Enums"]["estado_turno"]
          fecha_hora: string
          id: string
          profesional_id: string
        }
        Insert: {
          agenda_id: string
          centro_id: string
          especialidad_id: number
          estado?: Database["public"]["Enums"]["estado_turno"]
          fecha_hora: string
          id?: string
          profesional_id: string
        }
        Update: {
          agenda_id?: string
          centro_id?: string
          especialidad_id?: number
          estado?: Database["public"]["Enums"]["estado_turno"]
          fecha_hora?: string
          id?: string
          profesional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turnos_disponibles_agenda_id_fkey"
            columns: ["agenda_id"]
            isOneToOne: false
            referencedRelation: "agendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnos_disponibles_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnos_disponibles_especialidad_id_fkey"
            columns: ["especialidad_id"]
            isOneToOne: false
            referencedRelation: "especialidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turnos_disponibles_profesional_id_fkey"
            columns: ["profesional_id"]
            isOneToOne: false
            referencedRelation: "profesionales"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aceptar_invitacion: { Args: { p_token: string; p_user_agent?: string }; Returns: Json }
      invitar_acompanante: { Args: { p_alcance: string[]; p_email: string }; Returns: Json }
      revocar_acompanamiento: { Args: { p_id: string }; Returns: Json }
      ver_invitacion: { Args: { p_token: string }; Returns: Json }
      generar_agenda: {
        Args: {
          p_centro: string
          p_desde: string
          p_dias: number[]
          p_duracion: number
          p_especialidad: number
          p_hasta: string
          p_hora_fin: string
          p_hora_inicio: string
          p_profesional: string
        }
        Returns: Json
      }
      marcar_leidas: { Args: { p_id?: string }; Returns: undefined }
      cancelar_reserva: { Args: { p_motivo?: string; p_reserva: string }; Returns: Json }
      reprogramar_reserva: {
        Args: { p_confirmar_superposicion?: boolean; p_reserva: string; p_turno_nuevo: string }
        Returns: Json
      }
      buscar_turnos: {
        Args: {
          p_centro?: string
          p_desde?: string
          p_especialidad: number
          p_franja?: string
          p_lat?: number
          p_limite?: number
          p_lng?: number
          p_offset?: number
          p_orden?: string
        }
        Returns: {
          centro_direccion: string
          centro_id: string
          centro_localidad: string
          centro_nombre: string
          distancia_km: number
          especialidad_nombre_comun: string
          especialidad_nombre_tecnico: string
          estado: Database["public"]["Enums"]["estado_turno"]
          fecha_hora: string
          id: string
          profesional: string
          total: number
        }[]
      }
      distancia_km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      estado_bloqueo: { Args: { p_email: string }; Returns: number }
      limpiar_intentos: { Args: never; Returns: undefined }
      registrar_fallo: { Args: { p_email: string }; Returns: Json }
      reservar_turno: {
        Args: { p_confirmar_superposicion?: boolean; p_solicitante?: string; p_turno: string }
        Returns: Json
      }
    }
    Enums: {
      estado_reserva: "confirmada" | "cancelada" | "reprogramada" | "completada" | "ausente"
      estado_turno: "disponible" | "reservado" | "bloqueado"
      modo_turnos: "app" | "derivacion"
      rol: "solicitante" | "acompanante" | "admin"
      tipo_centro: "hospital" | "caps"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_reserva: ["confirmada", "cancelada", "reprogramada", "completada", "ausente"],
      estado_turno: ["disponible", "reservado", "bloqueado"],
      modo_turnos: ["app", "derivacion"],
      rol: ["solicitante", "acompanante", "admin"],
      tipo_centro: ["hospital", "caps"],
    },
  },
} as const
