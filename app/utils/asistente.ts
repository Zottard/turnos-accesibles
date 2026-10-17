// Funciones puras del asistente de reserva (/asistente): los pasos, el borrador y qué falta en
// cada paso. Las prueba tests/asistente.test.ts.

// Imports explícitos (y no los automáticos de Nuxt) para que Vitest los encuentre.
import { esFechaValida, type Franja } from '../../shared/utils/fechas'
import { FILTROS_VACIOS, type FiltrosBusqueda } from './turnos'

// Clave del borrador en sessionStorage. Se borra al confirmar el turno.
export const CLAVE_BORRADOR_ASISTENTE = 'ta_asistente'

// Un paso por pantalla. El título de cada pantalla (h1) es la pregunta.
export const PASOS_ASISTENTE = [
  'Contanos qué necesitás',
  '¿Qué médico necesitás?',
  '¿Dónde te queda cómodo?',
  '¿Qué día y hora?',
  'Revisá y confirmá',
] as const

export const ULTIMO_PASO = PASOS_ASISTENTE.length - 1

/**
 * Lo que la persona fue eligiendo. Solo ids y opciones: nunca el texto que escribió ni sus datos
 * personales, porque queda guardado en el navegador.
 */
export type BorradorAsistente = {
  paso: number
  especialidadId: number | null
  // Dónde: una localidad de la lista o la ubicación del navegador (redondeada, ~1 km).
  localidad: string
  lat: number | null
  lng: number | null
  centroId: number | null
  franja: Franja | null
  // Primer día que le sirve ("AAAA-MM-DD") o '' para cualquier día.
  desde: string
  // Pidió que sea cerca de su casa (lo entendió el paso 1, "Contanos").
  cerca: boolean
  turnoId: number | null
  // Cuándo empezó (milisegundos), para medir cuánto tardó (métricas de la v0.6).
  inicio: number
  // v0.5: para quién es el turno (id de la persona que se ayuda) o null si es para uno mismo.
  // Si al volver ya no se está ayudando a esa persona, el borrador se descarta.
  para: string | null
}

export function borradorNuevo(ahora = Date.now(), para: string | null = null): BorradorAsistente {
  return {
    paso: 0,
    especialidadId: null,
    localidad: '',
    lat: null,
    lng: null,
    centroId: null,
    franja: null,
    desde: '',
    cerca: false,
    turnoId: null,
    inicio: ahora,
    para,
  }
}

function numeroOnull(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null
}

/**
 * Lee un borrador guardado. Lo que no se entiende se descarta (empieza de cero ese dato).
 * `para`: a quién se está ayudando ahora (o null). Si el borrador era para otra persona, se
 * descarta entero: nunca se reserva para alguien distinto del que se ve en pantalla.
 */
export function normalizarBorrador(guardado: unknown, ahora = Date.now(), para: string | null = null): BorradorAsistente {
  const nuevo = borradorNuevo(ahora, para)
  if (typeof guardado !== 'object' || guardado === null) {
    return nuevo
  }
  const datos = guardado as Record<string, unknown>
  const paraGuardado = typeof datos.para === 'string' ? datos.para : null
  if (paraGuardado !== para) {
    return nuevo
  }
  const paso = Number.isInteger(datos.paso) ? (datos.paso as number) : 0
  const lat = numeroOnull(datos.lat)
  const lng = numeroOnull(datos.lng)
  const inicio = numeroOnull(datos.inicio)
  return {
    paso: paso >= 0 && paso <= ULTIMO_PASO ? paso : 0,
    especialidadId: numeroOnull(datos.especialidadId),
    localidad: typeof datos.localidad === 'string' ? datos.localidad : '',
    lat: lat !== null && lng !== null ? lat : null,
    lng: lat !== null && lng !== null ? lng : null,
    centroId: numeroOnull(datos.centroId),
    franja: datos.franja === 'manana' || datos.franja === 'tarde' ? datos.franja : null,
    desde: typeof datos.desde === 'string' && esFechaValida(datos.desde) ? datos.desde : '',
    cerca: datos.cerca === true,
    turnoId: numeroOnull(datos.turnoId),
    inicio: inicio !== null && inicio <= ahora ? inicio : nuevo.inicio,
    para,
  }
}

/**
 * Qué falta para pasar del paso. Devuelve el mensaje, o undefined si está todo.
 * El botón nunca se deshabilita: si falta algo, se explica.
 */
export function validarPaso(paso: number, borrador: BorradorAsistente): string | undefined {
  if ((paso === 1 || paso === ULTIMO_PASO) && borrador.especialidadId === null) {
    return 'Elegí qué médico necesitás: escribilo o elegilo de la lista.'
  }
  if (paso === 3 && borrador.turnoId === null) {
    return 'Elegí uno de los turnos de la lista.'
  }
  if (paso === ULTIMO_PASO && borrador.turnoId === null) {
    return 'Falta elegir el día y la hora del turno.'
  }
  return undefined
}

/** El primer paso al que le falta algo, o null si se puede confirmar. */
export function pasoIncompleto(borrador: BorradorAsistente): number | null {
  // Solo el paso 1 (qué médico) y el 3 (qué turno) son obligatorios.
  if (validarPaso(1, borrador)) return 1
  if (validarPaso(3, borrador)) return 3
  return null
}

/** Los filtros de la búsqueda (buscar_turnos) que salen del borrador. */
export function filtrosDelBorrador(borrador: BorradorAsistente): FiltrosBusqueda {
  return {
    ...FILTROS_VACIOS,
    especialidadId: borrador.especialidadId,
    localidad: borrador.localidad,
    lat: borrador.lat,
    lng: borrador.lng,
    centroId: borrador.centroId,
    desde: borrador.desde,
    franja: borrador.franja,
  }
}

/** Segundos desde que empezó el asistente (para la reserva). */
export function segundosDesde(inicio: number, ahora = Date.now()): number {
  return Math.max(0, Math.round((ahora - inicio) / 1000))
}
