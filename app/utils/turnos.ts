// Funciones puras de la búsqueda de turnos: filtros ↔ dirección (?esp=...), textos de los
// resultados y de la ficha. Las prueba tests/turnos.test.ts.

// Import explícito (y no el automático de Nuxt) para que Vitest lo encuentre.
// fechas.ts está en shared/ porque la usan la app y el servidor.
import { turnoEnPalabras, type Franja } from '../../shared/utils/fechas'

// Un turno tal como lo devuelve la búsqueda (función buscar_turnos de la base).
export type TurnoEncontrado = {
  id: number
  inicio: string
  centroId: number
  centroNombre: string
  centroDireccion: string
  centroLocalidad: string
  especialidadNombre: string
  especialidadNombreSimple: string
  profesional: string
  distanciaKm: number | null
  requisitos: string | null
}

// Lo que eligió la persona en /buscar. Todo es opcional menos la especialidad (para buscar).
export type FiltrosBusqueda = {
  especialidadId: number | null
  // Lo que escribió en "¿Qué necesitás?" si no eligió una especialidad.
  texto: string
  localidad: string
  // Ubicación del navegador ("Usar mi ubicación"), redondeada.
  lat: number | null
  lng: number | null
  centroId: number | null
  desde: string
  hasta: string
  franja: Franja | null
}

export const FILTROS_VACIOS: FiltrosBusqueda = {
  especialidadId: null,
  texto: '',
  localidad: '',
  lat: null,
  lng: null,
  centroId: null,
  desde: '',
  hasta: '',
  franja: null,
}

type Query = Record<string, unknown>

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

function numero(valor: unknown): number | null {
  const numero = Number(texto(valor))
  return texto(valor) !== '' && Number.isFinite(numero) ? numero : null
}

function fecha(valor: unknown): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(texto(valor)) ? texto(valor) : ''
}

/** Lee los filtros de la dirección (?esp=4&loc=Tigre...). Lo que no se entiende se ignora. */
export function filtrosDesdeQuery(query: Query): FiltrosBusqueda {
  const franja = texto(query.franja)
  const lat = numero(query.lat)
  const lng = numero(query.lng)
  const tieneUbicacion = lat !== null && lng !== null
  return {
    especialidadId: numero(query.esp),
    texto: texto(query.q),
    localidad: texto(query.loc),
    lat: tieneUbicacion ? lat : null,
    lng: tieneUbicacion ? lng : null,
    centroId: numero(query.centro),
    desde: fecha(query.desde),
    hasta: fecha(query.hasta),
    franja: franja === 'manana' || franja === 'tarde' ? franja : null,
  }
}

/**
 * Arma la dirección con los filtros: solo lo que tiene valor.
 * Así la búsqueda se puede recargar, volver atrás o compartir.
 * La ubicación va redondeada a 2 decimales (alrededor de 1 km): alcanza para ordenar por
 * cercanía y no deja la dirección exacta de la persona en el enlace.
 */
export function queryDesdeFiltros(filtros: FiltrosBusqueda): Record<string, string> {
  const query: Record<string, string> = {}
  if (filtros.especialidadId !== null) query.esp = String(filtros.especialidadId)
  else if (filtros.texto) query.q = filtros.texto
  if (filtros.lat !== null && filtros.lng !== null) {
    query.lat = filtros.lat.toFixed(2)
    query.lng = filtros.lng.toFixed(2)
  } else if (filtros.localidad) {
    query.loc = filtros.localidad
  }
  if (filtros.centroId !== null) query.centro = String(filtros.centroId)
  if (filtros.desde) query.desde = filtros.desde
  if (filtros.hasta) query.hasta = filtros.hasta
  if (filtros.franja) query.franja = filtros.franja
  return query
}

/** "a 2,3 km", "a menos de 1 km", "a 12 km". Sin distancia (no sabemos dónde estás), texto vacío. */
export function distanciaEnPalabras(km: number | null): string {
  if (km === null) {
    return ''
  }
  if (km < 1) {
    return 'a menos de 1 km'
  }
  const redondeo = km < 10 ? Math.round(km * 10) / 10 : Math.round(km)
  return `a ${redondeo.toLocaleString('es-AR')} km`
}

/** "Encontramos 12 turnos" / "Encontramos 1 turno" / "No encontramos turnos". */
export function cantidadEnPalabras(cantidad: number): string {
  if (cantidad === 0) {
    return 'No encontramos turnos'
  }
  return `Encontramos ${cantidad} ${cantidad === 1 ? 'turno' : 'turnos'}`
}

/**
 * Resumen corto de los primeros resultados, para leer en voz alta:
 * "Encontramos 12 turnos de Médico del corazón. El primero: hoy, martes 14 de octubre, a las 9:30,
 * en Hospital..., General Pacheco, a 2,3 km, con Dra. ..."
 */
export function resumenParaLeer(turnos: TurnoEncontrado[], ahora = new Date(), cuantos = 3): string {
  const primero = turnos[0]
  if (!primero) {
    return `${cantidadEnPalabras(0)}.`
  }
  const ORDINALES = ['El primero', 'El segundo', 'El tercero', 'El cuarto', 'El quinto']
  const frases = turnos.slice(0, Math.min(cuantos, ORDINALES.length)).map((turno, indice) => {
    const lugar = [turno.centroNombre, turno.centroLocalidad, distanciaEnPalabras(turno.distanciaKm)]
      .filter(Boolean)
      .join(', ')
    return `${ORDINALES[indice]}: ${turnoEnPalabras(turno.inicio, ahora)}, en ${lugar}, con ${turno.profesional}.`
  })
  return [`${cantidadEnPalabras(turnos.length)} de ${primero.especialidadNombreSimple}.`, ...frases].join(' ')
}

/** Los requisitos vienen en un texto, uno por renglón. Siempre pedimos al menos el DNI. */
export function listaRequisitos(requisitos: string | null): string[] {
  const lista = (requisitos ?? '')
    .split('\n')
    .map((linea) => linea.trim())
    .filter(Boolean)
  return lista.length > 0 ? lista : ['Llevá tu DNI.']
}

/** Enlace a Google Maps con el recorrido hasta el centro (desde donde esté la persona). */
export function enlaceComoLlegar(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

export const NOMBRES_TIPO_CENTRO: Record<string, string> = {
  hospital: 'Hospital',
  centro_de_salud: 'Centro de salud',
  unidad_sanitaria: 'Unidad sanitaria (salita del barrio)',
}
