// Funciones puras de las reservas (v0.4): mensajes de las funciones de la base, el estado que
// ve la persona y los textos para leer en voz alta. Las prueba tests/reservas.test.ts.

// Imports explícitos (y no los automáticos de Nuxt) para que Vitest los encuentre.
import { nombreCompleto } from '../../shared/utils/especialidades'
import { turnoEnPalabras } from '../../shared/utils/fechas'

// Una reserva tal como la devuelve mis_reservas (supabase/migrations/0401_reservas.sql).
export type Reserva = {
  id: string
  numero: number
  estado: 'confirmada' | 'cancelada' | 'reprogramada' | 'completada'
  canceladaTarde: boolean
  // v0.5: la sacó un acompañante (y su nombre).
  asistida: boolean
  creadaPorNombre: string | null
  // El turno que esta reemplazó, y el turno por el que se cambió esta.
  origenNumero: number | null
  nuevaNumero: number | null
  turnoId: number
  inicio: string
  duracionMin: number
  requisitos: string[]
  profesional: string
  especialidad: { id: number; nombre: string; nombreSimple: string }
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

// Lo que ve la persona. "Cumplido" no está guardado en la base: es una reserva confirmada cuyo
// turno ya pasó (así no hace falta una tarea programada que la cambie).
export type EstadoVisible = 'proximo' | 'cumplido' | 'cancelado' | 'reprogramado'

/** Ícono y palabra de cada estado: nunca solo el color. */
export const ESTADOS_TURNO: Record<EstadoVisible, { icono: string; texto: string }> = {
  proximo: { icono: '✓', texto: 'Confirmado' },
  cumplido: { icono: '●', texto: 'Cumplido' },
  cancelado: { icono: '✕', texto: 'Cancelado' },
  reprogramado: { icono: '↻', texto: 'Cambiado de fecha' },
}

export function estadoVisible(reserva: Pick<Reserva, 'estado' | 'inicio'>, ahora = new Date()): EstadoVisible {
  if (reserva.estado === 'cancelada') return 'cancelado'
  if (reserva.estado === 'reprogramada') return 'reprogramado'
  if (reserva.estado === 'completada' || new Date(reserva.inicio) <= ahora) return 'cumplido'
  return 'proximo'
}

/** Próximos (del más cercano al más lejano) y anteriores (del más nuevo al más viejo). */
export function separarReservas(reservas: Reserva[], ahora = new Date()): { proximos: Reserva[]; anteriores: Reserva[] } {
  const porFecha = [...reservas].sort((a, b) => a.inicio.localeCompare(b.inicio))
  return {
    proximos: porFecha.filter((reserva) => estadoVisible(reserva, ahora) === 'proximo'),
    anteriores: porFecha.filter((reserva) => estadoVisible(reserva, ahora) !== 'proximo').reverse(),
  }
}

/** El próximo turno confirmado, o null. */
export function proximaReserva(reservas: Reserva[], ahora = new Date()): Reserva | null {
  return separarReservas(reservas, ahora).proximos[0] ?? null
}

/** Faltan menos de 24 horas: el centro pide avisar antes para cancelar. */
export function esCancelacionTardia(inicio: string, ahora = new Date()): boolean {
  return new Date(inicio).getTime() - ahora.getTime() < 24 * 60 * 60 * 1000
}

// Cuando un acompañante opera los turnos de otra persona (v0.5): su nombre y qué quiso hacer.
export type ContextoAyuda = { nombre: string; accion: 'ver' | 'reservar' | 'cancelar' }

const QUE_QUISO: Record<ContextoAyuda['accion'], string> = {
  ver: 'ver sus turnos',
  reservar: 'sacarle turnos',
  cancelar: 'cancelar ni cambiar de fecha sus turnos',
}

/**
 * El mensaje en lenguaje simple para cada `motivo` que devuelven reservar_turno,
 * cancelar_reserva y reprogramar_reserva. Cualquier otro caso es un problema de conexión.
 * Con `ayuda` (modo acompañante), los mensajes hablan de la otra persona.
 */
export function mensajeReserva(motivo: string, ayuda?: ContextoAyuda): string {
  if (ayuda) {
    switch (motivo) {
      case 'sin_permiso':
        return `${ayuda.nombre} no te dio permiso para ${QUE_QUISO[ayuda.accion]}. Pedile que lo cambie desde su cuenta.`
      case 'sin_vinculo':
        return `${ayuda.nombre} ya no comparte sus turnos con vos.`
      case 'superpuesto':
        return `${ayuda.nombre} ya tiene otro turno ese mismo día o muy cerca de esa hora.`
      case 'no_vigente':
        return 'Este turno ya estaba cancelado o se cambió por otro.'
    }
  }
  switch (motivo) {
    case 'sin_permiso':
      return 'No tenés permiso para hacer esto con los turnos de esta persona. Pedile que lo cambie desde su cuenta.'
    case 'sin_vinculo':
      return 'Esta persona ya no comparte sus turnos con vos.'
    case 'sin_sesion':
      return 'Para confirmar el turno, primero ingresá con tu cuenta.'
    case 'no_existe':
      return 'No encontramos ese turno. Puede que el centro ya no lo ofrezca.'
    case 'vencido':
      return 'Ese turno ya pasó. Elegí otro.'
    case 'tomado':
      return 'Ese turno lo tomó otra persona recién.'
    case 'superpuesto':
      return 'Ya tenés otro turno ese mismo día o muy cerca de esa hora.'
    case 'ya_paso':
      return 'No se puede cancelar ni cambiar un turno que ya se cumplió o venció.'
    case 'no_vigente':
      return 'Este turno ya estaba cancelado o lo cambiaste por otro.'
    case 'fuera_de_plazo':
      return 'Falta menos de un día para el turno. El centro pide avisar con 24 horas.'
    case 'otra_especialidad':
      return 'El turno nuevo tiene que ser de la misma especialidad.'
    case 'mismo_turno':
      return 'Elegiste el mismo turno que ya tenías. Elegí otro día u horario.'
    default:
      return 'No pudimos completar el pedido. Revisá tu conexión a internet y probá de nuevo.'
  }
}

/** "Turno número 123. Oculista (Oftalmología), el martes 20 de octubre, a las 9:30, en ..." */
export function resumenReserva(reserva: Reserva, ahora = new Date()): string {
  const frases = [
    `Turno número ${reserva.numero}.`,
    `${nombreCompleto(reserva.especialidad)}, con ${reserva.profesional}.`,
    `${conMayuscula(turnoEnPalabras(reserva.inicio, ahora))}.`,
    `En ${reserva.centro.nombre}, ${reserva.centro.direccion}, ${reserva.centro.localidad}.`,
  ]
  if (reserva.requisitos.length > 0) {
    frases.push(`Qué llevar: ${reserva.requisitos.join(' ')}`)
  }
  return frases.join(' ')
}

/** "martes 20 de octubre" → "Martes 20 de octubre". */
export function conMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
