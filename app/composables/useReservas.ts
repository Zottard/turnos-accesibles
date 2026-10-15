// Reservas (v0.4): reservar, cancelar y cambiar de fecha, y la lista de "Mis turnos".
// Todo pasa por funciones de la base (RPC): la app nunca escribe la tabla `reservas`.
// Las funciones que cambian algo devuelven { ok: true, numero } o { ok: false, motivo, mensaje };
// las que leen devuelven { datos, error }. Los mensajes salen de mensajeReserva() (utils/reservas.ts).
//
// v0.5 (modo acompañante): si la persona está ayudando a otra (useAyuda), todas mandan p_para con
// el id de esa persona y la base revisa que esté dentro del alcance. Los mensajes hablan de ella.

// El turno con el que se superpone (motivo 'superpuesto').
export type Conflicto = { numero: number; inicio: string; especialidad: string; centro: string }

export type RespuestaReserva =
  | { ok: true; numero: number }
  | { ok: false; motivo: string; mensaje: string; conflicto?: Conflicto; horas?: number }

// Lo que devuelven las funciones de la base (jsonb).
type RespuestaBase = { ok?: boolean; motivo?: string; numero?: number; conflicto?: Conflicto; horas?: number }

export function useReservas() {
  const supabase = useSupabaseClient()
  const { ayudando, olvidarSiNoComparte } = useAyuda()

  function leerRespuesta(data: unknown, error: unknown, accion: ContextoAyuda['accion']): RespuestaReserva {
    const respuesta = (data ?? {}) as RespuestaBase
    if (error || typeof respuesta.ok !== 'boolean') {
      return { ok: false, motivo: 'conexion', mensaje: mensajeReserva('conexion') }
    }
    if (respuesta.ok && typeof respuesta.numero === 'number') {
      return { ok: true, numero: respuesta.numero }
    }
    const motivo = respuesta.motivo ?? 'conexion'
    const ayuda = ayudando.value ? { nombre: ayudando.value.nombre, accion } : undefined
    // Le sacaron el permiso: salimos del modo "Estás ayudando a...".
    if (motivo === 'sin_vinculo') olvidarSiNoComparte()
    return { ok: false, motivo, mensaje: mensajeReserva(motivo, ayuda), conflicto: respuesta.conflicto, horas: respuesta.horas }
  }

  // p_para solo si está ayudando a alguien.
  function para(): { p_para?: string } {
    return ayudando.value ? { p_para: ayudando.value.id } : {}
  }

  /**
   * Reserva el turno (reservar_turno). La base revisa que siga libre y que no se superponga.
   * `segundos`: cuánto tardó el asistente. Si lo reserva un acompañante, la base la marca asistida.
   */
  async function reservarTurno(
    turnoId: number,
    opciones: { confirmarSuperposicion: boolean; segundos: number },
  ): Promise<RespuestaReserva> {
    const { data, error } = await supabase.rpc('reservar_turno', {
      p_turno_id: turnoId,
      p_confirmar_superposicion: opciones.confirmarSuperposicion,
      p_segundos: opciones.segundos,
      ...para(),
    })
    return leerRespuesta(data, error, 'reservar')
  }

  /** Cancela. Con menos de 24 horas, la base pide confirmarTarde (motivo 'fuera_de_plazo'). */
  async function cancelarReserva(reservaId: string, confirmarTarde: boolean): Promise<RespuestaReserva> {
    const { data, error } = await supabase.rpc('cancelar_reserva', {
      p_reserva_id: reservaId,
      p_confirmar_tarde: confirmarTarde,
      ...para(),
    })
    return leerRespuesta(data, error, 'cancelar')
  }

  /** Cambia el turno por otro. Si el nuevo ya no está libre, el de antes queda igual. */
  async function reprogramarReserva(reservaId: string, nuevoTurnoId: number): Promise<RespuestaReserva> {
    const { data, error } = await supabase.rpc('reprogramar_reserva', {
      p_reserva_id: reservaId,
      p_nuevo_turno_id: nuevoTurnoId,
      ...para(),
    })
    return leerRespuesta(data, error, 'cancelar')
  }

  /**
   * Mis turnos (o los de la persona que estoy ayudando). Con `numero`, solo esa reserva.
   * sinPermiso: la persona ya no comparte sus turnos (se sale del modo ayuda).
   */
  async function cargarReservas(
    numero?: number,
  ): Promise<{ datos: Reserva[] | null; error: string | null; sinPermiso?: boolean }> {
    const { data, error } = await supabase.rpc('mis_reservas', { ...(numero ? { p_numero: numero } : {}), ...para() })
    if (error) {
      if (error.code === '42501' && ayudando.value) {
        const mensaje = mensajeReserva('sin_vinculo', { nombre: ayudando.value.nombre, accion: 'ver' })
        olvidarSiNoComparte()
        return { datos: null, error: mensaje, sinPermiso: true }
      }
      return { datos: null, error: 'No pudimos traer los turnos. Revisá tu conexión a internet y probá de nuevo.' }
    }
    return {
      datos: data.map((fila) => ({
        id: fila.id,
        numero: fila.numero,
        // La base solo acepta estos cuatro valores (check en la migración).
        estado: fila.estado as Reserva['estado'],
        canceladaTarde: fila.cancelada_tarde,
        asistida: fila.asistida,
        creadaPorNombre: fila.creada_por_nombre,
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
  async function cargarReserva(numero: number): Promise<{ datos: Reserva | null; error: string | null; sinPermiso?: boolean }> {
    const { datos, error, sinPermiso } = await cargarReservas(numero)
    return { datos: datos?.[0] ?? null, error, sinPermiso }
  }

  return { reservarTurno, cancelarReserva, reprogramarReserva, cargarReservas, cargarReserva }
}
