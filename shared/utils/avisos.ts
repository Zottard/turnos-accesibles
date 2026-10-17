// Avisos (v0.5): el texto en lenguaje simple de cada aviso.
// La base guarda el tipo y una foto del turno (notificaciones.datos, ver 0501_avisos_acompanantes.sql);
// acá se arma el título y el mensaje. Lo usan la app (bandeja y banda de avisos) y el servidor
// (correo), así dicen siempre lo mismo. Las prueba tests/avisos.test.ts.
// Tono: tranquilo, sin alarmas. Qué pasó y qué hacer, un dato por oración.

// Imports explícitos (y no los automáticos de Nuxt) para que Vitest los encuentre.
import { alcanceEnPalabras } from './acompanantes'
import { nombreCompleto } from './especialidades'
import { turnoEnPalabras } from './fechas'

export const TIPOS_AVISO = [
  'reserva',
  'cancelacion',
  'reprogramacion',
  'recordatorio',
  'acompanamiento',
  'disponibilidad',
  'correo',
] as const
export type TipoAviso = (typeof TIPOS_AVISO)[number]

// La foto que guarda la base. Según el tipo, vienen unos datos u otros.
export type DatosAviso = {
  numero?: number
  inicio?: string
  antes?: string // cambio de fecha: el día y la hora de antes
  especialidad?: string
  especialidad_simple?: string
  profesional?: string
  centro?: string
  direccion?: string
  localidad?: string
  telefono?: string | null
  requisitos?: string | null
  lat?: number
  lng?: number
  para?: string // nombre de la persona del turno
  por?: string // nombre de quien lo hizo, si fue un acompañante
  por_id?: string
  turno_id?: number // disponibilidad: el turno libre
  evento?: 'aceptado' | 'rechazado' | 'revocado' // acompanamiento
  nombre?: string // acompanamiento: la otra persona
  alcance?: string[]
  correo?: string // correo: la dirección que rechazó el correo
}

// Lo mínimo para armar el texto. solicitanteId distinto de usuarioId = copia para un acompañante.
export type AvisoParaTexto = {
  tipo: TipoAviso
  datos: DatosAviso
  usuarioId: string
  solicitanteId: string | null
}

export function esTipoAviso(valor: unknown): valor is TipoAviso {
  return TIPOS_AVISO.includes(valor as TipoAviso)
}

/** Lo que llega de la columna jsonb: si no es un objeto, sin datos. */
export function leerDatosAviso(valor: unknown): DatosAviso {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor) ? (valor as DatosAviso) : {}
}

/** ¿Es la copia de un aviso de otra persona (la que acompaña)? */
export function esCopiaDeAcompanante(aviso: Pick<AvisoParaTexto, 'usuarioId' | 'solicitanteId'>): boolean {
  return aviso.solicitanteId !== null && aviso.solicitanteId !== aviso.usuarioId
}

function conMayusculaInicial(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// "Médico clínico (Clínica médica)" o lo que haya.
function especialidadDe(datos: DatosAviso): string {
  if (datos.especialidad && datos.especialidad_simple) {
    return nombreCompleto({ nombre: datos.especialidad, nombreSimple: datos.especialidad_simple })
  }
  return datos.especialidad_simple ?? datos.especialidad ?? 'el turno'
}

// "en Centro de Salud Las Tunas, Calle Los Ceibos 830, General Pacheco"
function lugarDe(datos: DatosAviso): string {
  const partes = [datos.centro, datos.direccion, datos.localidad].filter(Boolean)
  return partes.length > 0 ? `en ${partes.join(', ')}` : ''
}

// "el lunes 19 de octubre, a las 8:00"
function cuandoDe(inicio: string | undefined, ahora: Date): string {
  return inicio ? turnoEnPalabras(inicio, ahora) : ''
}

// "Turno N.º 12: Médico clínico (Clínica médica), el lunes 19 de octubre, a las 8:00, en ..."
function resumenTurno(datos: DatosAviso, ahora: Date): string {
  const numero = datos.numero ? `Turno N.º ${datos.numero}: ` : ''
  const partes = [especialidadDe(datos), cuandoDe(datos.inicio, ahora), lugarDe(datos)].filter(Boolean)
  return `${numero}${partes.join(', ')}.`
}

// Quién lo hizo, si no fue la persona del turno: "Lo hizo Lucía." / "Lo hiciste vos."
function quienLoHizo(aviso: AvisoParaTexto, verbo: { otro: string; vos: string }): string {
  const { por, por_id: porId } = aviso.datos
  if (!por && !porId) return ''
  if (porId === aviso.usuarioId) return verbo.vos
  return por ? `${verbo.otro} ${por}.` : ''
}

/**
 * El título y el mensaje de un aviso, en lenguaje simple.
 * `ahora` sirve para decir "hoy" o "mañana" cuando corresponde (y para probarlo).
 */
export function textoAviso(aviso: AvisoParaTexto, ahora = new Date()): { titulo: string; mensaje: string } {
  const { datos } = aviso
  const copia = esCopiaDeAcompanante(aviso)
  const persona = datos.para || 'La persona que acompañás'

  switch (aviso.tipo) {
    case 'reserva': {
      const quien = quienLoHizo(aviso, { otro: 'Lo sacó', vos: 'Lo sacaste vos.' })
      const titulo = copia
        ? `${persona} tiene un turno nuevo`
        : datos.por
          ? `${datos.por} te sacó un turno`
          : 'Reservaste un turno'
      return { titulo, mensaje: [resumenTurno(datos, ahora), copia ? quien : ''].filter(Boolean).join(' ') }
    }
    case 'cancelacion': {
      const quien = quienLoHizo(aviso, { otro: 'Lo canceló', vos: 'Lo cancelaste vos.' })
      const titulo = copia ? `Se canceló un turno de ${persona}` : 'Se canceló tu turno'
      return {
        titulo,
        mensaje: [resumenTurno(datos, ahora), 'El horario quedó libre para otra persona.', quien].filter(Boolean).join(' '),
      }
    }
    case 'reprogramacion': {
      const quien = quienLoHizo(aviso, { otro: 'Lo cambió', vos: 'Lo cambiaste vos.' })
      const titulo = copia ? `Un turno de ${persona} cambió de fecha` : 'Tu turno cambió de fecha'
      const antes = datos.antes ? `Antes era ${turnoEnPalabras(datos.antes, ahora)}.` : ''
      return { titulo, mensaje: [`Ahora es así. ${resumenTurno(datos, ahora)}`, antes, quien].filter(Boolean).join(' ') }
    }
    case 'recordatorio': {
      const titulo = copia ? `Recordatorio: ${persona} tiene un turno` : 'Recordatorio: tenés un turno'
      return { titulo, mensaje: `${resumenTurno(datos, ahora)} Conviene llegar 15 minutos antes.` }
    }
    case 'acompanamiento': {
      const nombre = datos.nombre || 'Esa persona'
      if (datos.evento === 'aceptado') {
        const puede = alcanceEnPalabras(datos.alcance ?? ['ver'], 'tuyo')
        return {
          titulo: `${nombre} aceptó acompañarte`,
          mensaje: `Desde ahora puede ${puede}. Podés quitarle el permiso cuando quieras.`,
        }
      }
      if (datos.evento === 'rechazado') {
        return {
          titulo: `${nombre} no aceptó la invitación`,
          mensaje: 'No pasa nada. Si querés, podés invitar a otra persona.',
        }
      }
      return {
        titulo: `${nombre} dejó de compartir sus turnos con vos`,
        mensaje: 'Ya no vas a ver sus turnos ni sus avisos. Si fue un error, pedile que te invite de nuevo.',
      }
    }
    case 'disponibilidad':
      return {
        titulo: `Hay un turno de ${datos.especialidad_simple ?? 'lo que pediste'}`,
        mensaje: `Te avisamos porque lo pediste. Hay un turno libre de ${[especialidadDe(datos), cuandoDe(datos.inicio, ahora), lugarDe(datos)].filter(Boolean).join(', ')}. Si te sirve, reservalo.`,
      }
    case 'correo':
      return {
        titulo: 'Revisá tu correo electrónico',
        mensaje:
          `No pudimos mandarte un correo${datos.correo ? ` a ${datos.correo}` : ''}. Puede que la dirección esté mal escrita. ` +
          'Los avisos te siguen llegando acá. Podés cambiar tu correo en "Mi cuenta".',
      }
  }
}

/** Para leer en voz alta o mostrar en una línea: "Recordatorio: tenés un turno." */
export function tituloConPunto(titulo: string): string {
  return /[.?!]$/.test(titulo) ? titulo : `${conMayusculaInicial(titulo)}.`
}
