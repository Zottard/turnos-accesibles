// Panel administrativo (v0.6, RF-08 y RF-09): catálogo, agendas, auditoría y métricas.
// Solo funciona para el rol admin: lo controla la base (RLS y funciones que revisan es_admin).
// Las que leen devuelven { datos, error }; las que guardan, { ok: true } o { ok: false, mensaje }
// con un mensaje en lenguaje simple (y, si una baja quedó frenada, la lista de turnos reservados).

export type CentroAdmin = {
  id: number
  nombre: string
  tipo: string
  direccion: string
  localidad: string
  telefono: string | null
  horario: string | null
  lat: number
  lng: number
  accesibilidad: string | null
  activo: boolean
}

export type EspecialidadAdmin = {
  id: number
  nombre: string
  nombreSimple: string
  descripcion: string
  palabrasClave: string[]
  activa: boolean
}

export type ProfesionalAdmin = {
  id: number
  nombre: string
  especialidadId: number
  centroId: number
  especialidad: { nombre: string; nombreSimple: string } | null
  centro: { nombre: string; localidad: string } | null
}

export type ConflictoAgenda = { inicio: string; existente: string }

export type ResultadoAdmin =
  | { ok: true; id?: number; cantidad?: number }
  | { ok: false; mensaje: string; turnos?: TurnoReservado[]; conflictos?: ConflictoAgenda[] }

export type FilaAuditoria = EntradaAuditoria & { id: number }

export type ResumenPanel = { centros: number; centrosPublicados: number; especialidades: number; profesionales: number; turnosLibres: number }

const MENSAJE_LECTURA = 'No pudimos traer los datos. Revisá tu conexión a internet y probá de nuevo.'

type ErrorBase = { code?: string; message?: string; details?: string | null; hint?: string | null } | null

// Un error al guardar: una baja frenada por reservas, un nombre repetido u otra cosa.
function resultadoDeError(error: ErrorBase): ResultadoAdmin {
  const frenada = leerBajaFrenada(error)
  if (frenada) return { ok: false, mensaje: frenada.mensaje, turnos: frenada.turnos }
  if (error?.code === '23505') return { ok: false, mensaje: mensajeAdmin('duplicado') }
  if (error?.hint === 'agenda_vigente' && error.message) return { ok: false, mensaje: error.message }
  return { ok: false, mensaje: mensajeAdmin('conexion') }
}

// Lo que devuelven las funciones de agenda (jsonb).
type RespuestaAgenda = {
  ok?: boolean
  motivo?: string
  creados?: number
  cantidad?: number
  turnos?: TurnoReservado[]
  conflictos?: ConflictoAgenda[]
}

function leerRespuestaAgenda(data: unknown, error: unknown): ResultadoAdmin {
  const respuesta = (data ?? {}) as RespuestaAgenda
  if (error || typeof respuesta.ok !== 'boolean') return { ok: false, mensaje: mensajeAdmin('conexion') }
  if (respuesta.ok) return { ok: true, cantidad: respuesta.creados ?? respuesta.cantidad ?? 0 }
  const motivo = respuesta.motivo ?? 'conexion'
  return {
    ok: false,
    mensaje: mensajeAdmin(motivo, respuesta.cantidad ?? 0),
    turnos: respuesta.turnos,
    conflictos: respuesta.conflictos,
  }
}

export function useAdmin() {
  const supabase = useSupabaseClient()
  const usuario = useSupabaseUser()
  // Para no preguntar el rol en cada página: { id de la cuenta: ¿es admin? }.
  const rolesVistos = useState<Record<string, boolean>>('admin_roles', () => ({}))

  /** ¿La cuenta que ingresó es admin? null si no se pudo saber (sin conexión). */
  async function esAdmin(): Promise<boolean | null> {
    const id = usuario.value?.sub
    if (!id) return false
    if (id in rolesVistos.value) return rolesVistos.value[id]!
    const { data, error } = await supabase.from('perfiles').select('rol').eq('id', id).maybeSingle()
    if (error) return null
    const admin = data?.rol === 'admin'
    rolesVistos.value = { ...rolesVistos.value, [id]: admin }
    return admin
  }

  /** Deja registrado que alguien sin permiso quiso entrar al panel (RF-09). */
  async function registrarAccesoDenegado(ruta: string) {
    await supabase.rpc('registrar_acceso_denegado', { p_ruta: ruta })
  }

  // --- Panel ---

  async function cargarResumen(): Promise<{ datos: ResumenPanel | null; error: string | null }> {
    const ahora = new Date()
    const en30Dias = new Date(ahora.getTime() + 30 * 86400000)
    const [centros, especialidades, profesionales, turnos] = await Promise.all([
      supabase.from('centros').select('activo'),
      supabase.from('especialidades').select('id', { count: 'exact', head: true }).eq('activa', true),
      supabase.from('profesionales').select('id', { count: 'exact', head: true }),
      supabase
        .from('turnos')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'disponible')
        .gt('inicio', ahora.toISOString())
        .lt('inicio', en30Dias.toISOString()),
    ])
    if (centros.error || especialidades.error || profesionales.error || turnos.error) {
      return { datos: null, error: MENSAJE_LECTURA }
    }
    return {
      datos: {
        centros: centros.data.length,
        centrosPublicados: centros.data.filter((centro) => centro.activo).length,
        especialidades: especialidades.count ?? 0,
        profesionales: profesionales.count ?? 0,
        turnosLibres: turnos.count ?? 0,
      },
      error: null,
    }
  }

  // --- Centros ---

  async function cargarCentros(): Promise<{ datos: CentroAdmin[] | null; error: string | null }> {
    const { data, error } = await supabase
      .from('centros')
      .select('id, nombre, tipo, direccion, localidad, telefono, horario, lat, lng, accesibilidad, activo')
      .order('nombre')
    return error ? { datos: null, error: MENSAJE_LECTURA } : { datos: data, error: null }
  }

  async function cargarCentro(id: number): Promise<{ datos: CentroAdmin | null; error: string | null }> {
    const { data, error } = await supabase
      .from('centros')
      .select('id, nombre, tipo, direccion, localidad, telefono, horario, lat, lng, accesibilidad, activo')
      .eq('id', id)
      .maybeSingle()
    return error ? { datos: null, error: MENSAJE_LECTURA } : { datos: data, error: null }
  }

  /**
   * Crea (id null) o cambia un centro. Sin coordenadas, van las de la localidad. Si le faltan datos
   * obligatorios, la base lo guarda sin publicar. Si se da de baja con turnos reservados, la base
   * lo frena y devolvemos la lista.
   */
  async function guardarCentro(
    id: number | null,
    datos: DatosCentro,
    coordenadasLocalidad: { lat: number; lng: number } | null,
  ): Promise<ResultadoAdmin> {
    const lat = leerNumero(datos.lat) ?? coordenadasLocalidad?.lat
    const lng = leerNumero(datos.lng) ?? coordenadasLocalidad?.lng
    if (lat === undefined || lng === undefined) {
      return { ok: false, mensaje: 'Elegí la localidad o escribí las coordenadas del centro.' }
    }
    const fila = {
      nombre: datos.nombre.trim(),
      tipo: datos.tipo,
      direccion: datos.direccion.trim(),
      localidad: datos.localidad,
      telefono: datos.telefono.trim() || null,
      horario: datos.horario.trim() || null,
      accesibilidad: datos.accesibilidad.trim() || null,
      lat,
      lng,
      activo: datos.activo,
    }
    const { data, error } =
      id === null
        ? await supabase.from('centros').insert(fila).select('id').single()
        : await supabase.from('centros').update(fila).eq('id', id).select('id').single()
    if (error) return resultadoDeError(error)
    return { ok: true, id: data.id }
  }

  // --- Especialidades ---

  function aEspecialidad(fila: {
    id: number
    nombre: string
    nombre_simple: string
    descripcion: string
    palabras_clave: string[]
    activa: boolean
  }): EspecialidadAdmin {
    return {
      id: fila.id,
      nombre: fila.nombre,
      nombreSimple: fila.nombre_simple,
      descripcion: fila.descripcion,
      palabrasClave: fila.palabras_clave,
      activa: fila.activa,
    }
  }

  async function cargarEspecialidades(): Promise<{ datos: EspecialidadAdmin[] | null; error: string | null }> {
    const { data, error } = await supabase
      .from('especialidades')
      .select('id, nombre, nombre_simple, descripcion, palabras_clave, activa')
      .order('nombre_simple')
    return error ? { datos: null, error: MENSAJE_LECTURA } : { datos: data.map(aEspecialidad), error: null }
  }

  async function cargarEspecialidad(id: number): Promise<{ datos: EspecialidadAdmin | null; error: string | null }> {
    const { data, error } = await supabase
      .from('especialidades')
      .select('id, nombre, nombre_simple, descripcion, palabras_clave, activa')
      .eq('id', id)
      .maybeSingle()
    return error ? { datos: null, error: MENSAJE_LECTURA } : { datos: data ? aEspecialidad(data) : null, error: null }
  }

  async function guardarEspecialidad(id: number | null, datos: DatosEspecialidad): Promise<ResultadoAdmin> {
    const fila = {
      nombre: datos.nombre.trim(),
      nombre_simple: datos.nombreSimple.trim(),
      descripcion: datos.descripcion.trim(),
      palabras_clave: palabrasClaveDesdeTexto(datos.palabrasClave),
      activa: datos.activa,
    }
    const { data, error } =
      id === null
        ? await supabase.from('especialidades').insert(fila).select('id').single()
        : await supabase.from('especialidades').update(fila).eq('id', id).select('id').single()
    if (error) return resultadoDeError(error)
    return { ok: true, id: data.id }
  }

  // --- Profesionales ---

  async function cargarProfesionales(): Promise<{ datos: ProfesionalAdmin[] | null; error: string | null }> {
    const { data, error } = await supabase
      .from('profesionales')
      .select('id, nombre, especialidad_id, centro_id, especialidades (nombre, nombre_simple), centros (nombre, localidad)')
      .order('nombre')
    if (error) return { datos: null, error: MENSAJE_LECTURA }
    return {
      datos: data.map((fila) => ({
        id: fila.id,
        nombre: fila.nombre,
        especialidadId: fila.especialidad_id,
        centroId: fila.centro_id,
        especialidad: fila.especialidades
          ? { nombre: fila.especialidades.nombre, nombreSimple: fila.especialidades.nombre_simple }
          : null,
        centro: fila.centros,
      })),
      error: null,
    }
  }

  async function guardarProfesional(id: number | null, datos: DatosProfesional): Promise<ResultadoAdmin> {
    const fila = { nombre: datos.nombre.trim(), especialidad_id: datos.especialidadId!, centro_id: datos.centroId! }
    const { data, error } =
      id === null
        ? await supabase.from('profesionales').insert(fila).select('id').single()
        : await supabase.from('profesionales').update(fila).eq('id', id).select('id').single()
    if (error) return resultadoDeError(error)
    return { ok: true, id: data.id }
  }

  async function borrarProfesional(id: number): Promise<ResultadoAdmin> {
    const { data, error } = await supabase.rpc('borrar_profesional', { p_profesional_id: id })
    return leerRespuestaAgenda(data, error)
  }

  // --- Agendas ---

  /** Los turnos que vienen de un profesional (para el resumen de su agenda). */
  async function cargarAgenda(
    profesionalId: number,
  ): Promise<{ datos: { inicio: string; estado: string }[] | null; error: string | null }> {
    const { data, error } = await supabase
      .from('turnos')
      .select('inicio, estado')
      .eq('profesional_id', profesionalId)
      .gt('inicio', new Date().toISOString())
      .order('inicio')
      .limit(2000)
    return error ? { datos: null, error: MENSAJE_LECTURA } : { datos: data, error: null }
  }

  async function generarAgenda(datos: DatosAgenda): Promise<ResultadoAdmin> {
    const { data, error } = await supabase.rpc('generar_agenda', {
      p_profesional_id: datos.profesionalId!,
      p_desde: datos.desde,
      p_hasta: datos.hasta,
      p_dias: datos.dias.map(Number),
      p_hora_desde: datos.horaDesde,
      p_hora_hasta: datos.horaHasta,
      p_duracion: Number(datos.duracion),
      p_requisitos: datos.requisitos.trim() || undefined,
    })
    return leerRespuestaAgenda(data, error)
  }

  async function darDeBajaAgenda(profesionalId: number, desde: string, hasta: string): Promise<ResultadoAdmin> {
    const { data, error } = await supabase.rpc('dar_de_baja_agenda', {
      p_profesional_id: profesionalId,
      p_desde: desde,
      p_hasta: hasta,
    })
    return leerRespuestaAgenda(data, error)
  }

  // --- Auditoría ---

  /** Los últimos 100 cambios (o solo los de una tabla), del más nuevo al más viejo. */
  async function cargarAuditoria(tabla: string | null): Promise<{ datos: FilaAuditoria[] | null; error: string | null }> {
    let consulta = supabase
      .from('auditoria')
      .select('id, tabla, accion, registro_id, detalle, creado_en, perfiles (nombre, apellido)')
      .order('creado_en', { ascending: false })
      .limit(100)
    if (tabla) consulta = consulta.eq('tabla', tabla)
    const { data, error } = await consulta
    if (error) return { datos: null, error: MENSAJE_LECTURA }
    return {
      datos: data.map((fila) => ({
        id: fila.id,
        tabla: fila.tabla,
        accion: fila.accion,
        registroId: fila.registro_id,
        usuario: fila.perfiles ? `${fila.perfiles.nombre} ${fila.perfiles.apellido}`.trim() : null,
        detalle: typeof fila.detalle === 'object' && fila.detalle !== null && !Array.isArray(fila.detalle) ? fila.detalle : {},
        creadoEn: fila.creado_en,
      })),
      error: null,
    }
  }

  // --- Métricas ---

  async function cargarMetricas(
    desde: string,
    hasta: string,
    agrupar: Agrupar,
  ): Promise<{ datos: ReporteMetricas | null; error: string | null }> {
    const { data, error } = await supabase.rpc('metricas', { p_desde: desde, p_hasta: hasta, p_agrupar: agrupar })
    const respuesta = (data ?? {}) as { ok?: boolean; motivo?: string }
    if (error || typeof respuesta.ok !== 'boolean') {
      return { datos: null, error: 'No pudimos armar el reporte. Revisá tu conexión a internet y probá de nuevo.' }
    }
    if (!respuesta.ok) {
      return {
        datos: null,
        error: respuesta.motivo === 'sin_permiso' ? mensajeAdmin('sin_permiso') : 'Revisá las fechas del período.',
      }
    }
    const reporte = leerReporte(data)
    return reporte ? { datos: reporte, error: null } : { datos: null, error: 'No pudimos leer el reporte. Probá de nuevo.' }
  }

  return {
    esAdmin,
    registrarAccesoDenegado,
    cargarResumen,
    cargarCentros,
    cargarCentro,
    guardarCentro,
    cargarEspecialidades,
    cargarEspecialidad,
    guardarEspecialidad,
    cargarProfesionales,
    guardarProfesional,
    borrarProfesional,
    cargarAgenda,
    generarAgenda,
    darDeBajaAgenda,
    cargarAuditoria,
    cargarMetricas,
  }
}
