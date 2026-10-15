// Panel administrativo (v0.6): validaciones de los formularios, la vista previa de una agenda y el
// texto de cada fila de la auditoría. Son funciones puras: las prueba tests/admin.test.ts.
// La base vuelve a revisar todo (triggers y funciones de 0601_admin_metricas.sql).

// Import explícito (y no el automático de Nuxt) para que Vitest lo encuentre.
import { diaDeLaSemana, esFechaValida, fechaClave, horaEnPalabras, sumarDias, ZONA_ARGENTINA } from '../../shared/utils/fechas'
import { normalizar } from '../../shared/utils/especialidades'

export type ErrorCampo = { id: string; mensaje: string }

// --- Centros ---

export const TIPOS_CENTRO = ['hospital', 'centro_de_salud', 'unidad_sanitaria'] as const

/** Lo que tiene el formulario de un centro (todo como texto, como lo dan los campos). */
export type DatosCentro = {
  nombre: string
  tipo: string
  direccion: string
  localidad: string
  telefono: string
  horario: string
  lat: string
  lng: string
  accesibilidad: string
  activo: boolean
}

export const CENTRO_VACIO: DatosCentro = {
  nombre: '',
  tipo: '',
  direccion: '',
  localidad: '',
  telefono: '',
  horario: '',
  lat: '',
  lng: '',
  accesibilidad: '',
  activo: true,
}

/** Un número escrito a mano ("-34,46" o "-34.46"). null si no es un número. */
export function leerNumero(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (limpio === '' || !/^-?\d+(\.\d+)?$/.test(limpio)) return null
  return Number(limpio)
}

/** Errores que no dejan guardar el centro. Los datos que solo faltan para publicarlo van aparte. */
export function validarCentro(datos: DatosCentro, prefijo = 'centro'): ErrorCampo[] {
  const errores: ErrorCampo[] = []
  if (datos.nombre.trim() === '') errores.push({ id: `${prefijo}-nombre`, mensaje: 'Escribí el nombre del centro.' })
  if (!(TIPOS_CENTRO as readonly string[]).includes(datos.tipo)) {
    errores.push({ id: `${prefijo}-tipo`, mensaje: 'Elegí qué tipo de centro es.' })
  }
  if (datos.direccion.trim() === '') errores.push({ id: `${prefijo}-direccion`, mensaje: 'Escribí la dirección.' })
  if (datos.localidad.trim() === '') errores.push({ id: `${prefijo}-localidad`, mensaje: 'Elegí la localidad.' })

  // Las coordenadas son opcionales, pero si se escriben van las dos y tienen que ser números.
  const conLat = datos.lat.trim() !== ''
  const conLng = datos.lng.trim() !== ''
  if (conLat || conLng) {
    const lat = leerNumero(datos.lat)
    const lng = leerNumero(datos.lng)
    if (lat === null || lat < -90 || lat > 90) {
      errores.push({ id: `${prefijo}-lat`, mensaje: 'La latitud tiene que ser un número entre -90 y 90, por ejemplo -34,46.' })
    }
    if (lng === null || lng < -180 || lng > 180) {
      errores.push({ id: `${prefijo}-lng`, mensaje: 'La longitud tiene que ser un número entre -180 y 180, por ejemplo -58,64.' })
    }
  }
  return errores
}

/**
 * Lo que falta para que el centro aparezca en la búsqueda (RF-08: sin datos obligatorios no se
 * publica). Es la misma regla que el trigger al_guardar_centro de la base.
 */
export function faltantesParaPublicar(datos: Pick<DatosCentro, 'telefono' | 'horario' | 'accesibilidad'>): string[] {
  const faltan: string[] = []
  if (datos.telefono.trim() === '') faltan.push('el teléfono')
  if (datos.horario.trim() === '') faltan.push('el horario de atención')
  if (datos.accesibilidad.trim() === '') faltan.push('cómo es el edificio (accesibilidad)')
  return faltan
}

/** "a, b y c". */
export function listaEnPalabras(partes: string[]): string {
  if (partes.length <= 1) return partes.join('')
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
}

// --- Especialidades ---

export type DatosEspecialidad = {
  nombre: string
  nombreSimple: string
  descripcion: string
  palabrasClave: string
  activa: boolean
}

export const ESPECIALIDAD_VACIA: DatosEspecialidad = {
  nombre: '',
  nombreSimple: '',
  descripcion: '',
  palabrasClave: '',
  activa: true,
}

export function validarEspecialidad(datos: DatosEspecialidad, prefijo = 'especialidad'): ErrorCampo[] {
  const errores: ErrorCampo[] = []
  if (datos.nombre.trim() === '') {
    errores.push({ id: `${prefijo}-nombre`, mensaje: 'Escribí el nombre técnico, por ejemplo "Oftalmología".' })
  }
  if (datos.nombreSimple.trim() === '') {
    errores.push({ id: `${prefijo}-simple`, mensaje: 'Escribí el nombre simple, por ejemplo "Oculista".' })
  }
  if (datos.descripcion.trim() === '') {
    errores.push({ id: `${prefijo}-descripcion`, mensaje: 'Escribí en una frase qué atiende.' })
  }
  return errores
}

/**
 * "Ojos, vista ,  ANTEOJOS, ojos" → ['ojos', 'vista', 'anteojos']: en minúscula, sin tildes y sin
 * repetir (el buscador compara así). Se separan con comas.
 */
export function palabrasClaveDesdeTexto(texto: string): string[] {
  const palabras = texto.split(',').map((palabra) => normalizar(palabra)).filter((palabra) => palabra !== '')
  return [...new Set(palabras)]
}

// --- Profesionales ---

export type DatosProfesional = {
  nombre: string
  especialidadId: number | null
  centroId: number | null
}

export function validarProfesional(datos: DatosProfesional, prefijo = 'profesional'): ErrorCampo[] {
  const errores: ErrorCampo[] = []
  if (datos.nombre.trim() === '') {
    errores.push({ id: `${prefijo}-nombre`, mensaje: 'Escribí el nombre, por ejemplo "Dra. Ana Pérez".' })
  }
  if (datos.especialidadId === null) errores.push({ id: `${prefijo}-especialidad`, mensaje: 'Elegí la especialidad.' })
  if (datos.centroId === null) errores.push({ id: `${prefijo}-centro`, mensaje: 'Elegí el centro donde atiende.' })
  return errores
}

// --- Agendas ---

/** Días de la semana como los usa generar_agenda: 1 = lunes ... 7 = domingo. */
export const DIAS_SEMANA = [
  { valor: 1, nombre: 'Lunes' },
  { valor: 2, nombre: 'Martes' },
  { valor: 3, nombre: 'Miércoles' },
  { valor: 4, nombre: 'Jueves' },
  { valor: 5, nombre: 'Viernes' },
  { valor: 6, nombre: 'Sábado' },
  { valor: 7, nombre: 'Domingo' },
] as const

export type DatosAgenda = {
  profesionalId: number | null
  desde: string // AAAA-MM-DD
  hasta: string
  dias: string[] // los valores de DIAS_SEMANA como texto (vienen de casillas)
  horaDesde: string // HH:MM
  horaHasta: string
  duracion: string // minutos
  requisitos: string
}

export const MAXIMO_DIAS_AGENDA = 92
export const MAXIMO_TURNOS_AGENDA = 2000

/** "08:30" → 510 (minutos desde las 0). null si no es una hora. */
export function minutosDelDia(hora: string): number | null {
  const partes = /^(\d{1,2}):(\d{2})$/.exec(hora.trim())
  if (!partes) return null
  const horas = Number(partes[1])
  const minutos = Number(partes[2])
  if (horas > 23 || minutos > 59) return null
  return horas * 60 + minutos
}

/** Días entre dos fechas AAAA-MM-DD (hasta - desde). */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86400000)
}

/** Las mismas reglas que generar_agenda (datos_invalidos), con el mensaje para cada campo. */
export function validarAgenda(datos: DatosAgenda, hoy = fechaClave(new Date())): ErrorCampo[] {
  const errores: ErrorCampo[] = []
  if (datos.profesionalId === null) errores.push({ id: 'agenda-profesional', mensaje: 'Elegí el profesional.' })

  if (!esFechaValida(datos.desde)) {
    errores.push({ id: 'agenda-desde', mensaje: 'Elegí desde qué día.' })
  } else if (datos.desde < hoy) {
    errores.push({ id: 'agenda-desde', mensaje: 'Esa fecha ya pasó. Elegí desde hoy en adelante.' })
  }
  if (!esFechaValida(datos.hasta)) {
    errores.push({ id: 'agenda-hasta', mensaje: 'Elegí hasta qué día.' })
  } else if (esFechaValida(datos.desde) && datos.hasta < datos.desde) {
    errores.push({ id: 'agenda-hasta', mensaje: 'Tiene que ser el mismo día o después del primero.' })
  } else if (esFechaValida(datos.desde) && diasEntre(datos.desde, datos.hasta) > MAXIMO_DIAS_AGENDA) {
    errores.push({ id: 'agenda-hasta', mensaje: 'Cargá como mucho tres meses por vez.' })
  }

  if (datos.dias.length === 0) errores.push({ id: 'agenda-dias', mensaje: 'Marcá al menos un día de la semana.' })

  const desde = minutosDelDia(datos.horaDesde)
  const hasta = minutosDelDia(datos.horaHasta)
  if (desde === null) errores.push({ id: 'agenda-hora-desde', mensaje: 'Escribí a qué hora empieza.' })
  if (hasta === null) {
    errores.push({ id: 'agenda-hora-hasta', mensaje: 'Escribí a qué hora termina.' })
  } else if (desde !== null && hasta <= desde) {
    errores.push({ id: 'agenda-hora-hasta', mensaje: 'Tiene que terminar después de la hora en que empieza.' })
  }

  const duracion = Number(datos.duracion)
  if (!Number.isInteger(duracion) || duracion < 5 || duracion > 240) {
    errores.push({ id: 'agenda-duracion', mensaje: 'La duración va de 5 a 240 minutos.' })
  }
  return errores
}

/** Un turno de la vista previa: el día (AAAA-MM-DD) y la hora ("08:30"). */
export type TurnoPrevio = { dia: string; hora: string }

function horaConCeros(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
}

/**
 * Los turnos que va a crear generar_agenda con estos datos (mismo cálculo): todos los días del
 * rango que caen en los días elegidos, de horaDesde a horaHasta, cada `duracion` minutos (el último
 * tiene que terminar antes de horaHasta). Los de hoy que ya pasaron no cuentan.
 * Para "Se van a crear N turnos" antes de confirmar. Si los datos no sirven, una lista vacía.
 * Corta en MAXIMO_TURNOS_AGENDA + 1 (con eso ya se sabe que son demasiados).
 */
export function vistaPreviaAgenda(datos: DatosAgenda, ahora = new Date()): TurnoPrevio[] {
  const desde = minutosDelDia(datos.horaDesde)
  const hasta = minutosDelDia(datos.horaHasta)
  const duracion = Number(datos.duracion)
  if (
    !esFechaValida(datos.desde) || !esFechaValida(datos.hasta) || datos.hasta < datos.desde ||
    desde === null || hasta === null || hasta <= desde || !Number.isInteger(duracion) || duracion < 5 ||
    diasEntre(datos.desde, datos.hasta) > MAXIMO_DIAS_AGENDA
  ) {
    return []
  }
  const dias = new Set(datos.dias.map(Number))
  const lista: TurnoPrevio[] = []
  for (let dia = datos.desde; dia <= datos.hasta; dia = sumarDias(dia, 1)) {
    const deLaSemana = diaDeLaSemana(dia) === 0 ? 7 : diaDeLaSemana(dia)
    if (!dias.has(deLaSemana)) continue
    for (let inicio = desde; inicio + duracion <= hasta; inicio += duracion) {
      const hora = horaConCeros(inicio)
      // Hora argentina (UTC-3, sin horario de verano).
      if (new Date(`${dia}T${hora}:00-03:00`) <= ahora) continue
      lista.push({ dia, hora })
      if (lista.length > MAXIMO_TURNOS_AGENDA) return lista
    }
  }
  return lista
}

// --- Respuestas de la base ---

/** Un turno reservado que frena una baja (lo que manda la base, sin datos personales). */
export type TurnoReservado = { numero: number; inicio: string; profesional: string; especialidad: string; centro: string }

/**
 * La base frena una baja con un error: mensaje listo para mostrar, la lista en `details` (jsonb) y
 * hint 'reservas_vigentes'. Devuelve el mensaje y la lista, o null si es otro error.
 */
export function leerBajaFrenada(error: {
  message?: string
  details?: string | null
  hint?: string | null
} | null): { mensaje: string; cantidad: number; turnos: TurnoReservado[] } | null {
  if (!error || error.hint !== 'reservas_vigentes') return null
  let cantidad = 0
  let turnos: TurnoReservado[] = []
  try {
    const detalle = JSON.parse(error.details ?? '{}') as { cantidad?: number; turnos?: TurnoReservado[] }
    cantidad = Number(detalle.cantidad) || 0
    turnos = Array.isArray(detalle.turnos) ? detalle.turnos : []
  } catch {
    // Sin la lista, igual mostramos el mensaje.
  }
  return { mensaje: error.message ?? '', cantidad, turnos }
}

/** Qué decirle al admin según el motivo que devolvió una función de la base. */
export function mensajeAdmin(motivo: string, cantidad = 0): string {
  switch (motivo) {
    case 'sin_permiso':
      return 'Esta parte es solo para administradores.'
    case 'no_existe':
      return 'Ese profesional ya no existe. Recargá la página.'
    case 'datos_invalidos':
      return 'Revisá las fechas y los horarios.'
    case 'sin_turnos':
      return 'Con esos días y horarios no se arma ningún turno. Revisá los días de la semana y el horario.'
    case 'demasiados':
      return `Serían ${cantidad} turnos: son demasiados para una sola vez. Cargá menos días.`
    case 'superpuesto':
      return cantidad === 1
        ? 'No cargamos la agenda: 1 turno se superpone con otro de este profesional.'
        : `No cargamos la agenda: ${cantidad} turnos se superponen con otros de este profesional.`
    case 'reservados':
      return cantidad === 1
        ? 'No podés dar de baja estos turnos: hay 1 turno reservado. Primero reasignalo o cancelalo.'
        : `No podés dar de baja estos turnos: hay ${cantidad} turnos reservados. Primero reasignalos o cancelalos.`
    case 'con_historial':
      return 'No podés borrar a este profesional: tiene turnos con reservas anteriores, que quedan como registro. Si deja de atender, dale de baja la agenda.'
    case 'duplicado':
      return 'Ya hay uno con ese nombre. Usá otro nombre.'
    default:
      return 'No pudimos guardar. Revisá tu conexión a internet y probá de nuevo.'
  }
}

// --- Auditoría ---

export type EntradaAuditoria = {
  tabla: string
  accion: string
  registroId: string | null
  usuario: string | null
  detalle: Record<string, unknown>
  creadoEn: string
}

const NOMBRES_CAMPOS: Record<string, string> = {
  nombre: 'el nombre',
  tipo: 'el tipo',
  direccion: 'la dirección',
  localidad: 'la localidad',
  telefono: 'el teléfono',
  horario: 'el horario',
  lat: 'la ubicación',
  lng: 'la ubicación',
  accesibilidad: 'la accesibilidad',
  activo: 'si está publicado',
  activa: 'si está activa',
  nombre_simple: 'el nombre simple',
  descripcion: 'la descripción',
  palabras_clave: 'las palabras clave',
  especialidad_id: 'la especialidad',
  centro_id: 'el centro',
  requisitos: 'los requisitos',
  estado: 'el estado',
  duracion_min: 'la duración',
}

const QUE_ES: Record<string, string> = {
  centros: 'el centro',
  especialidades: 'la especialidad',
  profesionales: 'al profesional',
  turnos: 'el turno',
}

/** "14/10 a las 18:03", en hora argentina. */
export function momentoCorto(fecha: string | Date): string {
  const dia = new Intl.DateTimeFormat('es-AR', { timeZone: ZONA_ARGENTINA, day: '2-digit', month: '2-digit' }).format(
    new Date(fecha),
  )
  const hora = horaEnPalabras(fecha)
  return `${dia} ${hora.startsWith('1:') ? 'a la' : 'a las'} ${hora}`
}

/** "19/10" desde "2026-10-19". */
function diaCorto(clave: unknown): string {
  return typeof clave === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(clave) ? `${clave.slice(8, 10)}/${clave.slice(5, 7)}` : ''
}

/**
 * Cada fila de la auditoría en una frase: "Admin Karma modificó el centro «Hospital…» (el teléfono)
 * el 14/10 a las 18:03."
 */
export function textoAuditoria(entrada: EntradaAuditoria): string {
  const quien = entrada.usuario?.trim() || 'Alguien'
  const cuando = `el ${momentoCorto(entrada.creadoEn)}`
  const detalle = entrada.detalle ?? {}
  const nombre = typeof detalle.nombre === 'string' ? detalle.nombre : ''

  if (entrada.accion === 'acceso_denegado') {
    const ruta = typeof detalle.ruta === 'string' ? detalle.ruta : 'el panel'
    return `${quien} intentó entrar a ${ruta} sin permiso de administrador ${cuando}.`
  }

  if (entrada.tabla === 'reservas') {
    const numero = detalle.numero ?? entrada.registroId
    const que = entrada.accion === 'baja' ? 'canceló' : 'cambió de fecha'
    const como = detalle.asistida === true ? ' (como acompañante)' : ''
    return `${quien}${como} ${que} la reserva N.º ${numero} ${cuando}.`
  }

  if (entrada.tabla === 'turnos' && detalle.agenda === true) {
    const cantidad = Number(detalle.cantidad) || 0
    const turnos = cantidad === 1 ? '1 turno' : `${cantidad} turnos`
    const rango = `del ${diaCorto(detalle.desde)} al ${diaCorto(detalle.hasta)}`
    return entrada.accion === 'baja'
      ? `${quien} dio de baja ${cantidad === 1 ? '1 turno libre' : `${cantidad} turnos libres`} de la agenda de ${nombre} (${rango}) ${cuando}.`
      : `${quien} cargó ${turnos} en la agenda de ${nombre} (${rango}) ${cuando}.`
  }

  const queEs = QUE_ES[entrada.tabla] ?? 'el registro'
  // Un turno suelto: el "nombre" es su día y hora.
  const cual = entrada.tabla === 'turnos' && nombre ? ` del ${momentoCorto(nombre)}` : nombre ? ` «${nombre}»` : ''
  const verbo = entrada.accion === 'alta' ? 'dio de alta' : entrada.accion === 'baja' ? 'dio de baja' : 'modificó'
  let cambios = ''
  if (entrada.accion === 'modificacion' && Array.isArray(detalle.campos)) {
    const campos = [...new Set(detalle.campos.map((campo) => NOMBRES_CAMPOS[String(campo)] ?? String(campo)))]
    if (campos.length > 0) cambios = ` (${listaEnPalabras(campos)})`
  }
  return `${quien} ${verbo} ${queEs}${cual}${cambios} ${cuando}.`
}

export const NOMBRES_TABLA_AUDITORIA: Record<string, string> = {
  centros: 'Centros',
  especialidades: 'Especialidades',
  profesionales: 'Profesionales',
  turnos: 'Agendas y turnos',
  reservas: 'Cancelaciones y cambios de fecha',
  panel: 'Intentos sin permiso',
}
