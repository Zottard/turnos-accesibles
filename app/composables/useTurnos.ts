// Datos de la búsqueda de turnos (v0.3): el catálogo, la búsqueda, la ficha de un turno y el
// pedido "Avisame cuando haya turno". Cada función devuelve { datos, error } con un mensaje en
// lenguaje simple; la página decide cómo mostrarlo.

export type Localidad = { nombre: string; lat: number; lng: number }

export type CentroResumen = { id: number; nombre: string; localidad: string }

export type Catalogo = {
  especialidades: Especialidad[]
  localidades: Localidad[]
  centros: CentroResumen[]
}

export type FichaTurno = {
  id: number
  inicio: string
  duracionMin: number
  disponible: boolean
  requisitos: string[]
  profesional: string
  especialidad: { id: number; nombre: string; nombreSimple: string; descripcion: string }
  centro: {
    id: number
    nombre: string
    tipo: string
    direccion: string
    localidad: string
    telefono: string | null
    horario: string | null
    accesibilidad: string | null
    lat: number
    lng: number
  }
}

const MENSAJE_CONEXION = 'No pudimos conectarnos. Revisá tu conexión a internet y probá de nuevo.'

export function useTurnos() {
  const supabase = useSupabaseClient()

  /** Especialidades, localidades y centros: son pocos, los traemos todos de una vez. */
  async function cargarCatalogo(): Promise<{ datos: Catalogo | null; error: string | null }> {
    const [especialidades, localidades, centros] = await Promise.all([
      supabase.from('especialidades').select('id, nombre, nombre_simple, descripcion, palabras_clave').order('nombre_simple'),
      supabase.from('localidades').select('nombre, lat, lng').order('nombre'),
      supabase.from('centros').select('id, nombre, localidad').order('nombre'),
    ])
    if (especialidades.error || localidades.error || centros.error) {
      return { datos: null, error: MENSAJE_CONEXION }
    }
    return {
      datos: {
        especialidades: especialidades.data.map((fila) => ({
          id: fila.id,
          nombre: fila.nombre,
          nombreSimple: fila.nombre_simple,
          descripcion: fila.descripcion,
          palabrasClave: fila.palabras_clave,
        })),
        localidades: localidades.data,
        centros: centros.data,
      },
      error: null,
    }
  }

  /**
   * Busca turnos libres con una sola llamada a la base (función buscar_turnos).
   * `cerca` es el punto desde donde medir la distancia: la ubicación o el centro de la localidad.
   */
  async function buscarTurnos(
    filtros: FiltrosBusqueda,
    cerca: { lat: number; lng: number } | null,
  ): Promise<{ datos: TurnoEncontrado[] | null; error: string | null }> {
    if (filtros.especialidadId === null) {
      return { datos: [], error: null }
    }
    // Lo que no se eligió no se manda: la base usa su valor por defecto (sin filtro).
    const { data, error } = await supabase.rpc('buscar_turnos', {
      p_especialidad_id: filtros.especialidadId,
      p_centro_id: filtros.centroId ?? undefined,
      p_lat: cerca?.lat,
      p_lng: cerca?.lng,
      p_desde: filtros.desde || undefined,
      p_hasta: filtros.hasta || undefined,
      p_franja: filtros.franja ?? undefined,
    })
    if (error) {
      return { datos: null, error: 'No pudimos buscar los turnos. Revisá tu conexión a internet y probá de nuevo.' }
    }
    return {
      datos: data.map((fila) => ({
        id: fila.id,
        inicio: fila.inicio,
        centroId: fila.centro_id,
        centroNombre: fila.centro_nombre,
        centroDireccion: fila.centro_direccion,
        centroLocalidad: fila.centro_localidad,
        especialidadNombre: fila.especialidad_nombre,
        especialidadNombreSimple: fila.especialidad_nombre_simple,
        profesional: fila.profesional,
        distanciaKm: fila.distancia_km,
        requisitos: fila.requisitos,
      })),
      error: null,
    }
  }

  /**
   * La ficha de un turno. datos = null y error = null: el turno no existe o ya pasó
   * (la base solo deja ver turnos futuros de centros activos).
   */
  async function cargarTurno(id: number): Promise<{ datos: FichaTurno | null; error: string | null }> {
    const { data, error } = await supabase
      .from('turnos')
      .select(
        `id, inicio, duracion_min, estado, requisitos,
         profesionales (nombre),
         especialidades (id, nombre, nombre_simple, descripcion),
         centros (id, nombre, tipo, direccion, localidad, telefono, horario, accesibilidad, lat, lng)`,
      )
      .eq('id', id)
      .maybeSingle()
    if (error) {
      return { datos: null, error: MENSAJE_CONEXION }
    }
    // Si el centro o la especialidad se dieron de baja, la base no nos los muestra.
    if (!data || !data.centros || !data.especialidades || !data.profesionales) {
      return { datos: null, error: null }
    }
    return {
      datos: {
        id: data.id,
        inicio: data.inicio,
        duracionMin: data.duracion_min,
        disponible: data.estado === 'disponible',
        requisitos: listaRequisitos(data.requisitos),
        profesional: data.profesionales.nombre,
        especialidad: {
          id: data.especialidades.id,
          nombre: data.especialidades.nombre,
          nombreSimple: data.especialidades.nombre_simple,
          descripcion: data.especialidades.descripcion,
        },
        centro: data.centros,
      },
      error: null,
    }
  }

  /** "Avisame cuando haya turno". Solo con la sesión iniciada. Pedirlo dos veces no es un error. */
  async function pedirAviso(especialidadId: number, localidad: string | null): Promise<Resultado> {
    const { error } = await supabase
      .from('avisos_disponibilidad')
      .insert({ especialidad_id: especialidadId, localidad: localidad || null })
    // 23505: ya existía el mismo pedido. Para la persona está todo bien igual.
    if (error && error.code !== '23505') {
      return { ok: false, mensaje: 'No pudimos guardar tu pedido. Probá de nuevo en un rato.' }
    }
    return { ok: true }
  }

  return { cargarCatalogo, buscarTurnos, cargarTurno, pedirAviso }
}
