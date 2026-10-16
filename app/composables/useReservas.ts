// Reservas (v0.4): reservar, cancelar y cambiar de fecha, y la lista de "Mis turnos".
// Todo pasa por funciones de la base (RPC): la app nunca escribe la tabla `reservas`.
// Las funciones que cambian algo devuelven { ok: true, numero } o { ok: false, motivo, mensaje };
// las que leen devuelven { datos, error }. Los mensajes salen de mensajeReserva() (utils/reservas.ts).

// El turno con el que se superpone (motivo 'superpuesto').
export type Conflicto = { numero: number; inicio: string; especialidad: string; centro: string }

export type RespuestaReserva =
  | { ok: true; numero: number }
  | { ok: false; motivo: string; mensaje: string; conflicto?: Conflicto; horas?: number }

// Lo que devuelven las funciones de la base (jsonb).
type RespuestaBase = { ok?: boolean; motivo?: string; numero?: number; conflicto?: Conflicto; horas?: number }

function leerRespuesta(data: unknown, error: unknown): RespuestaReserva {
  const respuesta = (data ?? {}) as RespuestaBase
  if (error || typeof respuesta.ok !== 'boolean') {
    return { ok: false, motivo: 'conexion', mensaje: mensajeReserva('conexion') }
  }
  if (respuesta.ok && typeof respuesta.numero === 'number') {
    return { ok: true, numero: respuesta.numero }
  }
  const motivo = respuesta.motivo ?? 'conexion'
  return { ok: false, motivo, mensaje: mensajeReserva(motivo), conflicto: respuesta.conflicto, horas: respuesta.horas }
}

export function useReservas() {
  const supabase = useSupabaseClient()

  /**
   * Reserva el turno (reservar_turno). La base revisa que siga libre y que no se superponga.
   * `segundos`: cuánto tardó el asistente. asistida queda en false: la usa el acompañante (v0.5).
   */
  async function reservarTurno(
    turnoId: number,
    opciones: { confirmarSuperposicion: boolean; segundos: number },
  ): Promise<RespuestaReserva> {
    const { data, error } = await supabase.rpc('reservar_turno', {
      p_turno_id: turnoId,
      p_confirmar_superposicion: opciones.confirmarSuperposicion,
      p_asistida: false,
      p_segundos: opciones.segundos,
    })
    return leerRespuesta(data, error)
  }

  /** Cancela. Con menos de 24 horas, la base pide confirmarTarde (motivo 'fuera_de_plazo'). */
  async function cancelarReserva(reservaId: string, confirmarTarde: boolean): Promise<RespuestaReserva> {
    const { data, error } = await supabase.rpc('cancelar_reserva', {
      p_reserva_id: reservaId,
      p_confirmar_tarde: confirmarTarde,
    })
    return leerRespuesta(data, error)
  }

  /** Cambia el turno por otro. Si el nuevo ya no está libre, el de antes queda igual. */
  async function reprogramarReserva(reservaId: string, nuevoTurnoId: number): Promise<RespuestaReserva> {
    const { data, error } = await supabase.rpc('reprogramar_reserva', {
      p_reserva_id: reservaId,
      p_nuevo_turno_id: nuevoTurnoId,
    })
    return leerRespuesta(data, error)
  }

  /** Mis turnos. Con `numero`, solo esa reserva (para el comprobante). */
  async function cargarReservas(numero?: number): Promise<{ datos: Reserva[] | null; error: string | null }> {
    const { data, error } = await supabase.rpc('mis_reservas', numero ? { p_numero: numero } : {})
    if (error) {
      return { datos: null, error: 'No pudimos traer tus turnos. Revisá tu conexión a internet y probá de nuevo.' }
    }
    return {
      datos: data.map((fila) => ({
        id: fila.id,
        numero: fila.numero,
        // La base solo acepta estos cuatro valores (check en la migración).
        estado: fila.estado as Reserva['estado'],
        canceladaTarde: fila.cancelada_tarde,
        origenNumero: fila.origen_numero,
        nuevaNumero: fila.nueva_numero,
        turnoId: fila.turno_id,
        inicio: fila.inicio,
        duracionMin: fila.duracion_min,
        requisitos: listaRequisitos(fila.requisitos),
        profesional: fila.profesional,
        especialidad: {
          id: fila.especialidad_id,
          nombre: fila.especialidad_nombre,
          nombreSimple: fila.especialidad_nombre_simple,
        },
        centro: {
          id: fila.centro_id,
          nombre: fila.centro_nombre,
          tipo: fila.centro_tipo,
          direccion: fila.centro_direccion,
          localidad: fila.centro_localidad,
          telefono: fila.centro_telefono,
          horario: fila.centro_horario,
          accesibilidad: fila.centro_accesibilidad,
          lat: fila.centro_lat,
          lng: fila.centro_lng,
        },
      })),
      error: null,
    }
  }

  /** Una reserva por su número. datos = null y error = null: no existe o no es tuya. */
  async function cargarReserva(numero: number): Promise<{ datos: Reserva | null; error: string | null }> {
    const { datos, error } = await cargarReservas(numero)
    return { datos: datos?.[0] ?? null, error }
  }

  return { reservarTurno, cancelarReserva, reprogramarReserva, cargarReservas, cargarReserva }
}
