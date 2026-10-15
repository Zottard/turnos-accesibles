// Funciones puras de los avisos en la app (v0.5): la bandeja, la banda de avisos nuevos, cómo
// avisar según la preferencia y cuándo sale el recordatorio. Las prueba tests/avisos.test.ts.
// El texto de cada aviso lo arma textoAviso() (shared/utils/avisos.ts).

// Imports explícitos (y no los automáticos de Nuxt) para que Vitest los encuentre.
import type { DatosAviso, TipoAviso } from '../../shared/utils/avisos'
import { momentoEnPalabras } from '../../shared/utils/fechas'
import type { CanalAviso } from './preferencias'

// Un aviso tal como lo lee la app (tabla `notificaciones`).
export type Notificacion = {
  id: string
  tipo: TipoAviso
  datos: DatosAviso
  usuarioId: string
  solicitanteId: string | null
  reservaId: string | null
  enviarDesde: string
  entregadaEn: string | null
  leidaEn: string | null
}

/**
 * Cuándo sale el recordatorio de un turno: `horas` antes. null si ese momento ya pasó (el aviso de
 * la reserva ya cumple esa función). Es el mismo cálculo que privado.momento_recordatorio en la base.
 */
export function momentoRecordatorio(inicio: string | Date, horas: number, ahora = new Date()): Date | null {
  const momento = new Date(new Date(inicio).getTime() - horas * 60 * 60 * 1000)
  return momento > ahora ? momento : null
}

/**
 * Cómo avisar algo nuevo, según el canal que eligió la persona. La banda escrita sale siempre
 * (es lo que queda para releer).
 * - visual: solo la banda.
 * - sonoro: un sonido suave y la lectura del título ("un sonido y la lectura del aviso").
 * - ambos: banda y sonido; la lectura, si tiene activada la lectura en voz alta.
 */
export function comoAvisar(canal: CanalAviso, lecturaVoz: boolean): { tono: boolean; voz: boolean } {
  if (canal === 'visual') return { tono: false, voz: false }
  if (canal === 'sonoro') return { tono: true, voz: true }
  return { tono: true, voz: lecturaVoz }
}

/** Los avisos de la banda: sin leer y sin cerrar, del más nuevo al más viejo. */
export function avisosParaBanda(avisos: Notificacion[], cerrados: readonly string[]): Notificacion[] {
  return avisos
    .filter((aviso) => aviso.leidaEn === null && !cerrados.includes(aviso.id))
    .sort((a, b) => b.enviarDesde.localeCompare(a.enviarDesde))
}

/** Los que la app todavía no mostró nunca: con estos suena el aviso (una sola vez). */
export function avisosSinEntregar(avisos: Notificacion[]): Notificacion[] {
  return avisos.filter((aviso) => aviso.entregadaEn === null)
}

/** La bandeja: primero los sin leer, después los leídos; cada grupo del más nuevo al más viejo. */
export function ordenarBandeja(avisos: Notificacion[]): Notificacion[] {
  return [...avisos].sort((a, b) => {
    const leidoA = a.leidaEn === null ? 0 : 1
    const leidoB = b.leidaEn === null ? 0 : 1
    return leidoA - leidoB || b.enviarDesde.localeCompare(a.enviarDesde)
  })
}

/** "Avisos (2 sin leer)" para lectores de pantalla; el número se ve en el encabezado. */
export function textoContador(cantidad: number): string {
  if (cantidad === 0) return 'Avisos, ninguno sin leer'
  return cantidad === 1 ? 'Avisos, 1 sin leer' : `Avisos, ${cantidad} sin leer`
}

/**
 * El historial de un aviso: enviado (llegó su hora), entregado (la app lo mostró) y leído.
 * "Enviado el miércoles 14 de octubre de 2026, a las 9:00."
 */
export function historialAviso(aviso: Pick<Notificacion, 'enviarDesde' | 'entregadaEn' | 'leidaEn'>): string[] {
  const lineas = [`Enviado el ${momentoEnPalabras(aviso.enviarDesde)}.`]
  if (aviso.entregadaEn) lineas.push(`Lo viste en la app el ${momentoEnPalabras(aviso.entregadaEn)}.`)
  if (aviso.leidaEn) lineas.push(`Lo leíste el ${momentoEnPalabras(aviso.leidaEn)}.`)
  return lineas
}

/** Los tipos que hablan de un turno (llevan día, centro, dirección, qué llevar y cómo llegar). */
export function esAvisoDeTurno(tipo: TipoAviso): boolean {
  return tipo === 'reserva' || tipo === 'cancelacion' || tipo === 'reprogramacion' || tipo === 'recordatorio' || tipo === 'disponibilidad'
}
