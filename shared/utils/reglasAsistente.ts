// Reglas del asistente: entienden un pedido escrito como se habla
// ("necesito un turno con el oculista cerca de casa") sin inteligencia artificial.
// El servidor (server/api/interpretar.post.ts) las usa siempre primero; si hay clave de Anthropic
// prueba además con Claude y, si la respuesta de Claude no sirve, se queda con estas.
// Son funciones puras: las prueba tests/reglasAsistente.test.ts.

// Imports explícitos (y no los automáticos de Nuxt) para que Vitest los encuentre.
import { especialidadDeLaFrase, nombreCompleto, normalizar, type Especialidad } from './especialidades'
import {
  NOMBRES_FRANJA,
  diaDeCampoEnPalabras,
  esFechaValida,
  fechaClave,
  lunesQueViene,
  proximoDia,
  sumarDias,
  type Franja,
} from './fechas'

/** Lo que entendimos del pedido. Es la respuesta de POST /api/interpretar. */
export type PedidoInterpretado = {
  especialidadId: number | null
  cerca: boolean
  franja: Franja | null
  // Primer día que le sirve ("AAAA-MM-DD"). null: cualquier día, lo antes posible.
  desde: string | null
  fuente: 'ia' | 'reglas'
  // true si sabemos qué especialidad busca.
  entendido: boolean
  // Lo que entendimos, en una frase simple, para preguntarle "¿Es así?".
  explicacion: string
}

/** Los datos sueltos, sin la fuente ni la explicación. */
export type DatosPedido = Pick<PedidoInterpretado, 'especialidadId' | 'cerca' | 'franja' | 'desde'>

// Hasta cuántos días adelante aceptamos una fecha (la agenda de prueba llega a 30).
const DIAS_MAXIMOS = 90

const DIAS_SEMANA: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
}

/**
 * Lee el pedido con reglas simples. Primero saca del texto la hora, el día y "cerca"; con lo
 * que queda busca la especialidad (así "mañana" o "tarde" no se confunden con un médico).
 */
export function interpretarConReglas(texto: string, especialidades: Especialidad[], ahora = new Date()): DatosPedido {
  // Sin tildes ni mayúsculas: "Mañana" → "manana".
  let resto = normalizar(texto)

  // Si encuentra el patrón, lo saca del texto y avisa que estaba.
  function sacar(patron: RegExp): RegExpExecArray | null {
    const encontrado = patron.exec(resto)
    if (encontrado) {
      resto = resto.replace(encontrado[0], ' ')
    }
    return encontrado
  }

  // 1. ¿A la mañana o a la tarde? (antes que el día: "mañana a la mañana")
  let franja: Franja | null = null
  if (sacar(/\b(?:a|por|de|en) la manana\b/) || sacar(/\btemprano\b/)) {
    franja = 'manana'
  } else if (sacar(/\b(?:a|por|de|en) la tarde\b/) || sacar(/\btarde\b/)) {
    franja = 'tarde'
  }

  // 2. ¿Desde qué día?
  const hoy = fechaClave(ahora)
  let desde: string | null = null
  if (sacar(/\b(?:lo antes posible|cuanto antes|lo mas pronto posible|lo mas pronto|urgente)\b/)) {
    // Lo antes posible: sin fecha. Igual lo sacamos del texto para que no confunda.
    desde = null
  } else if (sacar(/\bpasado manana\b/)) {
    desde = sumarDias(hoy, 2)
  } else if (sacar(/\bmanana\b/)) {
    desde = sumarDias(hoy, 1)
  } else if (sacar(/\bhoy\b/)) {
    desde = hoy
  } else if (sacar(/\b(?:la semana que viene|la semana proxima|la proxima semana)\b/)) {
    desde = lunesQueViene(hoy)
  } else {
    // "el jueves", "este lunes", "el próximo martes": el próximo de ese día (hoy incluido).
    const dia = sacar(/\b(?:este |el proximo |el |proximo )?(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b/)
    if (dia) {
      desde = proximoDia(hoy, DIAS_SEMANA[dia[1]!]!)
    }
  }

  // 3. ¿Cerca de casa?
  const cerca = Boolean(
    sacar(/\bcerca(?: de (?:mi )?casa| de donde vivo| de aca| mio)?\b/) || sacar(/\bcerquita\b/) || sacar(/\bmi barrio\b/),
  )

  // 4. La especialidad, con lo que quedó del texto.
  const especialidad = especialidadDeLaFrase(resto, especialidades)

  return { especialidadId: especialidad?.id ?? null, cerca, franja, desde }
}

/**
 * Revisa lo que respondió la IA. Si algo no es válido (una especialidad que no existe, una franja
 * rara, una fecha que ya pasó), devuelve null y se usan las reglas.
 * La IA responde especialidadId 0 cuando no sabe, franja 'cualquiera' y desde '' cuando no dice.
 */
export function validarRespuestaIA(respuesta: unknown, especialidades: Especialidad[], ahora = new Date()): DatosPedido | null {
  if (typeof respuesta !== 'object' || respuesta === null) {
    return null
  }
  const { especialidadId, cerca, franja, desde } = respuesta as Record<string, unknown>

  if (typeof especialidadId !== 'number' || !Number.isInteger(especialidadId)) {
    return null
  }
  if (especialidadId !== 0 && !especialidades.some((especialidad) => especialidad.id === especialidadId)) {
    return null
  }
  if (typeof cerca !== 'boolean') {
    return null
  }
  if (franja !== 'manana' && franja !== 'tarde' && franja !== 'cualquiera') {
    return null
  }
  if (typeof desde !== 'string') {
    return null
  }
  const hoy = fechaClave(ahora)
  if (desde !== '' && (!esFechaValida(desde) || desde < hoy || desde > sumarDias(hoy, DIAS_MAXIMOS))) {
    return null
  }

  return {
    especialidadId: especialidadId === 0 ? null : especialidadId,
    cerca,
    franja: franja === 'cualquiera' ? null : franja,
    desde: desde === '' ? null : desde,
  }
}

/** "desde mañana, jueves 15 de octubre" o "desde el martes 20 de octubre". */
function desdeEnPalabras(desde: string, ahora: Date): string {
  const dia = diaDeCampoEnPalabras(desde, ahora)
  return dia.startsWith('hoy') || dia.startsWith('mañana') ? `desde ${dia}` : `desde el ${dia}`
}

/**
 * Lo que entendimos, en una frase: "Entendimos que buscás un turno de Oculista (Oftalmología),
 * cerca de tu casa, a la mañana."
 */
export function explicarPedido(datos: DatosPedido, especialidades: Especialidad[], ahora = new Date()): string {
  const partes: string[] = []
  if (datos.cerca) partes.push('cerca de tu casa')
  if (datos.franja) partes.push(NOMBRES_FRANJA[datos.franja])
  if (datos.desde) partes.push(desdeEnPalabras(datos.desde, ahora))

  const especialidad = especialidades.find((item) => item.id === datos.especialidadId)
  if (!especialidad) {
    if (partes.length === 0) {
      return 'No entendimos qué médico necesitás.'
    }
    return `No entendimos qué médico necesitás. Sí entendimos que lo querés ${partes.join(', ')}.`
  }
  return `Entendimos que buscás un turno de ${[nombreCompleto(especialidad), ...partes].join(', ')}.`
}

/** Arma la respuesta completa del endpoint. */
export function armarPedido(
  datos: DatosPedido,
  fuente: PedidoInterpretado['fuente'],
  especialidades: Especialidad[],
  ahora = new Date(),
): PedidoInterpretado {
  return {
    ...datos,
    fuente,
    entendido: datos.especialidadId !== null,
    explicacion: explicarPedido(datos, especialidades, ahora),
  }
}
